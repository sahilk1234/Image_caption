# app/inference.py
import os, json, time
from pathlib import Path
from typing import List, Tuple
from PIL import Image
import torch
from torchvision import transforms

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

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

# ---- device: force CPU for TorchScript on macOS to avoid MPS issues ----
MODEL_DEVICE = torch.device("cpu")

# ---- load vocab/config ----
if not VOCAB_JSON.exists():
    raise FileNotFoundError(f"VOCAB_JSON not found at {VOCAB_JSON}")
if not CONFIG_JSON.exists():
    raise FileNotFoundError(f"CONFIG_JSON not found at {CONFIG_JSON}")

with VOCAB_JSON.open("r", encoding="utf-8") as f:
    vocab = json.load(f)
itos = vocab["itos"]; stoi = vocab["stoi"]

with CONFIG_JSON.open("r", encoding="utf-8") as f:
    cfg = json.load(f)
IMG_SIZE = int(os.getenv("IMG_SIZE", cfg.get("IMG_SIZE", 224)))

preproc = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]),
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

_model_ts = None

def load_models():
    global _model_ts
    if MODEL_TS.exists():
        _model_ts = torch.jit.load(str(MODEL_TS), map_location="cpu").eval()
    elif WEIGHTS_PT.exists():
        raise RuntimeError(
            f"TorchScript not found at {MODEL_TS}. Export model_ts.pt or add eager loader for {WEIGHTS_PT}."
        )
    else:
        raise FileNotFoundError(
            f"No artifacts found. Expected {MODEL_TS} or {WEIGHTS_PT}."
        )

load_models()

def caption_image(pil_img: Image.Image) -> Tuple[str, int, str]:
    t0 = time.time()
    x = preproc(pil_img).unsqueeze(0).to(MODEL_DEVICE)
    with torch.no_grad():
        y = _model_ts(x)
        y = y[0] if isinstance(y, (list, tuple)) else y
        token_ids = y.squeeze().to(torch.long).cpu()

    caption = ids_to_text(token_ids, itos)

    latency = int((time.time() - t0) * 1000)
    return caption, latency, MODEL_TS.name
