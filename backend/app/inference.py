# app/inference.py
import os, json, time, logging, inspect, gc
from pathlib import Path
from typing import Tuple
from PIL import Image

import torch
from torchvision import transforms

from .modeling import OptimizedCaptionNet

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logger = logging.getLogger(__name__)

# ---- resolve artifacts relative to backend/ ----
BASE_DIR = Path(__file__).resolve().parents[1]

def resolve_artifact(env_key: str, default_rel: str) -> Path:
    v = os.getenv(env_key)
    p = Path(v) if v else (BASE_DIR / default_rel)
    return p if p.is_absolute() else (BASE_DIR / p)

VOCAB_JSON: Path = resolve_artifact("VOCAB_JSON", "artifacts/vocab.json")
CONFIG_JSON: Path = resolve_artifact("CONFIG_JSON", "artifacts/config.json")
MODEL_TS:   Path = resolve_artifact("MODEL_TS",   "artifacts/model_ts.pt")
WEIGHTS_PT: Path = resolve_artifact("WEIGHTS_PT", "artifacts/weights.pt")

def pick_device() -> torch.device:
    """
    Choose runtime device.
    Default is CPU (safe for most VPS).
    Set MODEL_DEVICE=cuda to use GPU if available and your torch build supports it.
    """
    req = (os.getenv("MODEL_DEVICE", "cpu") or "cpu").lower().strip()
    if req in {"cuda", "cuda:0", "gpu"} and torch.cuda.is_available():
        return torch.device("cuda:0")
    return torch.device("cpu")

MODEL_DEVICE = pick_device()

# ---- load vocab/config ----
if not VOCAB_JSON.exists():
    raise FileNotFoundError(f"VOCAB_JSON not found at {VOCAB_JSON}")
if not CONFIG_JSON.exists():
    raise FileNotFoundError(f"CONFIG_JSON not found at {CONFIG_JSON}")

with VOCAB_JSON.open("r", encoding="utf-8") as f:
    vocab = json.load(f)
itos = vocab["itos"]
stoi = vocab["stoi"]

with CONFIG_JSON.open("r", encoding="utf-8") as f:
    cfg = json.load(f)

def cfg_get(key: str, default):
    return cfg.get(key, cfg.get(key.lower(), cfg.get(key.upper(), default)))

IMG_SIZE = int(os.getenv("IMG_SIZE", cfg_get("img_size", 224)))
BEAM_SIZE = int(os.getenv("BEAM_SIZE", cfg_get("beam_size", 3)))
MAX_LEN = int(os.getenv("MAX_LEN", cfg_get("max_len", 25)))
LENGTH_PENALTY = float(os.getenv("LENGTH_PENALTY", cfg_get("length_penalty", 1.0)))

PAD_IDX = int(cfg_get("pad_idx", vocab.get("specials", {}).get("pad_idx", 0)))
BOS_IDX = int(cfg_get("bos_idx", vocab.get("specials", {}).get("bos_idx", 1)))
EOS_IDX = int(cfg_get("eos_idx", vocab.get("specials", {}).get("eos_idx", 2)))

preproc = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def ids_to_text(ids, itos_list):
    if torch.is_tensor(ids):
        ids = ids.detach().view(-1).to(torch.long).cpu().tolist()
    else:
        ids = [int(x if not torch.is_tensor(x) else x.item()) for x in ids]

    words = []
    for idx in ids:
        w = itos_list[int(idx)]
        if w == "<eos>":
            break
        if w in {"<bos>", "<pad>"}:
            continue
        words.append(w)
    return " ".join(words)

def _ts_mentions_cuda(ts_module) -> bool:
    """
    If you traced on CUDA, TorchScript can bake device=torch.device("cuda:0")
    into the graph. That will crash on CPU-only builds.
    """
    try:
        code = ts_module.code  # ScriptModule has .code
        return "cuda" in code.lower()
    except Exception:
        return False

def _looks_like_lfs_pointer(path: Path) -> bool:
    try:
        with path.open("rb") as f:
            head = f.read(200)
        text = head.decode("utf-8", errors="ignore")
        return text.startswith("version https://git-lfs.github.com/spec/v1")
    except Exception:
        return False

def greedy_decode_ts(model, images: torch.Tensor) -> torch.Tensor:
    """
    Greedy decode for a training-style forward(images, caps) -> (logits, aux)
    where logits is [B, T, V] and caps is [B, T+1].
    """
    B = images.size(0)
    caps = torch.full((B, MAX_LEN + 1), PAD_IDX, dtype=torch.long, device=images.device)
    caps[:, 0] = BOS_IDX

    for step in range(MAX_LEN - 1):
        out = model(images, caps)
        logits = out[0] if isinstance(out, (list, tuple)) else out  # [B, T, V]
        next_ids = logits[:, step, :].argmax(dim=-1)  # [B]
        caps[:, step + 1] = next_ids

        # Stop early if all finished
        if torch.all(next_ids == EOS_IDX):
            break

    return caps  # [B, MAX_LEN+1]

_model_ts = None
_model_eager = None
_model_version = None

def _build_eager_model() -> OptimizedCaptionNet:
    return OptimizedCaptionNet(
        vocab_size=int(cfg_get("vocab_size", len(itos))),
        d_model=int(cfg_get("d_model", 512)),
        nhead=int(cfg_get("nhead", 8)),
        num_layers=int(cfg_get("num_decoder_layers", cfg_get("num_layers", 4))),
        ff_dim=int(cfg_get("ff_dim", 1024)),
        dropout=float(cfg_get("dropout", 0.1)),
        pad_idx=PAD_IDX,
        bos_idx=BOS_IDX,
        eos_idx=EOS_IDX,
        max_len=MAX_LEN,
    )

def _load_eager_weights() -> OptimizedCaptionNet:
    if _looks_like_lfs_pointer(WEIGHTS_PT):
        raise RuntimeError(
            f"WEIGHTS_PT looks like a Git LFS pointer. Ensure artifacts are fetched. WEIGHTS_PT={WEIGHTS_PT}"
        )
    load_kwargs = {"map_location": MODEL_DEVICE}
    try:
        params = inspect.signature(torch.load).parameters
        if "weights_only" in params:
            load_kwargs["weights_only"] = True
        if "mmap" in params:
            load_kwargs["mmap"] = True
    except (TypeError, ValueError):
        pass

    checkpoint = torch.load(str(WEIGHTS_PT), **load_kwargs)
    if isinstance(checkpoint, torch.nn.Module):
        model = checkpoint
    else:
        if not isinstance(checkpoint, dict):
            raise RuntimeError(f"Unsupported weights format in {WEIGHTS_PT}")
        state_dict = checkpoint.get("model_state_dict") or checkpoint.get("state_dict") or checkpoint
        if any(k.startswith("module.") for k in state_dict):
            state_dict = {k.replace("module.", "", 1): v for k, v in state_dict.items()}
        model = _build_eager_model()
        try:
            model.load_state_dict(state_dict)
        except RuntimeError as exc:
            raise RuntimeError(f"Failed to load weights from {WEIGHTS_PT}") from exc
        del state_dict
    del checkpoint
    gc.collect()
    return model.to(MODEL_DEVICE).eval()

def load_models():
    global _model_ts, _model_eager, _model_version
    if _model_ts is not None or _model_eager is not None:
        return

    if MODEL_TS.exists():
        if _looks_like_lfs_pointer(MODEL_TS):
            logger.warning("MODEL_TS looks like a Git LFS pointer. Falling back to eager weights.")
        else:
            try:
                _model_ts = torch.jit.load(str(MODEL_TS), map_location=MODEL_DEVICE).eval()
            except Exception as exc:
                logger.warning("Failed to load MODEL_TS (%s). Falling back to eager weights if available.", exc)
                _model_ts = None

        # If runtime is CPU but TS graph is CUDA-baked, fall back to eager weights.
        if _model_ts is not None and MODEL_DEVICE.type == "cpu" and _ts_mentions_cuda(_model_ts):
            if WEIGHTS_PT.exists():
                _model_ts = None
                _model_eager = _load_eager_weights()
                _model_version = WEIGHTS_PT.name
                return

            raise RuntimeError(
                "Your TorchScript model appears to be traced/scripted with CUDA baked into the graph "
                "(it contains 'cuda' in TorchScript code). You are running on CPU, so it will crash.\n\n"
                "Fix: re-export TorchScript on CPU (model.to('cpu') before export), or provide weights.pt "
                "for eager loading.\n"
                f"MODEL_TS={MODEL_TS}"
            )

        if _model_ts is not None:
            _model_version = MODEL_TS.name
            return

        if WEIGHTS_PT.exists():
            _model_eager = _load_eager_weights()
            _model_version = WEIGHTS_PT.name
            return

    if WEIGHTS_PT.exists():
        _model_eager = _load_eager_weights()
        _model_version = WEIGHTS_PT.name
        return

    raise FileNotFoundError(f"No artifacts found. Expected {MODEL_TS} or {WEIGHTS_PT}.")

if os.getenv("MODEL_AUTOLOAD", "1").strip().lower() not in {"0", "false", "no"}:
    load_models()

def caption_image(pil_img: Image.Image) -> Tuple[str, int, str]:
    t0 = time.time()

    if _model_ts is None and _model_eager is None:
        load_models()
    model = _model_ts or _model_eager
    if model is None:
        raise RuntimeError("Model failed to load; check MODEL_TS/WEIGHTS_PT configuration.")

    x = preproc(pil_img).unsqueeze(0).to(MODEL_DEVICE)

    with torch.no_grad():
        # Prefer model-native beam search if present (and if it works on your TS)
        if hasattr(model, "generate_beam"):
            token_ids = model.generate_beam(x, BEAM_SIZE, MAX_LEN, LENGTH_PENALTY)
            # normalize to [B, ...]
            if torch.is_tensor(token_ids) and token_ids.dim() == 1:
                token_ids = token_ids.unsqueeze(0)
        else:
            token_ids = greedy_decode_ts(model, x)  # [B, MAX_LEN+1]

    caption = ids_to_text(token_ids[0], itos)
    latency = int((time.time() - t0) * 1000)
    return caption, latency, _model_version or (MODEL_TS.name if _model_ts is not None else WEIGHTS_PT.name)
