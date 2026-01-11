# app/modeling.py
import math

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision


class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 256):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, :x.size(1)]


class EfficientResNetEncoder(nn.Module):
    """Lightweight ResNet50 encoder."""
    def __init__(self, dmodel: int = 512, pretrained: bool = False):
        super().__init__()
        weights = torchvision.models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
        resnet = torchvision.models.resnet50(weights=weights)

        self.stem = nn.Sequential(
            resnet.conv1,
            resnet.bn1,
            resnet.relu,
            resnet.maxpool,
        )
        self.layer1 = resnet.layer1
        self.layer2 = resnet.layer2
        self.layer3 = resnet.layer3
        self.layer4 = resnet.layer4

        self.proj = nn.Sequential(
            nn.Conv2d(2048, dmodel, 1),
            nn.GroupNorm(32, dmodel),
            nn.GELU(),
        )

        self.pos_embed = nn.Parameter(torch.randn(1, dmodel, 7, 7) * 0.02)
        self.ln = nn.LayerNorm(dmodel)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        feat = self.proj(x)
        feat = feat + self.pos_embed
        feat = feat.flatten(2).transpose(1, 2)
        feat = self.ln(feat)
        return feat


class OptimizedCaptionNet(nn.Module):
    def __init__(self, vocab_size: int, d_model: int = 512, nhead: int = 8,
                 num_layers: int = 4, ff_dim: int = 1024, dropout: float = 0.1,
                 pad_idx: int = 0, bos_idx: int = 1, eos_idx: int = 2, max_len: int = 25):
        super().__init__()
        self.pad_idx, self.bos_idx, self.eos_idx = pad_idx, bos_idx, eos_idx
        self.max_len = max_len
        self.d_model = d_model

        self.encoder = EfficientResNetEncoder(dmodel=d_model)

        self.tok_emb = nn.Embedding(vocab_size, d_model, padding_idx=pad_idx)
        nn.init.normal_(self.tok_emb.weight, mean=0, std=0.02)

        self.pos = PositionalEncoding(d_model, max_len=256)
        self.emb_dropout = nn.Dropout(dropout)

        decoder_layer = nn.TransformerDecoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=ff_dim,
            dropout=dropout,
            activation="gelu",
            batch_first=False,
            norm_first=True,
        )
        self.decoder = nn.TransformerDecoder(decoder_layer, num_layers=num_layers)

        self.final_ln = nn.LayerNorm(d_model)
        self.out = nn.Linear(d_model, vocab_size)
        nn.init.normal_(self.out.weight, mean=0, std=0.02)

    def _tgt_mask(self, t: int, device: torch.device) -> torch.Tensor:
        return torch.triu(torch.full((t, t), float("-inf"), device=device), diagonal=1)

    def forward(self, images: torch.Tensor, caps: torch.Tensor):
        memory = self.encoder(images).transpose(0, 1)

        tgt_in = caps[:, :-1]
        tgt_out = caps[:, 1:]

        tgt = self.tok_emb(tgt_in)
        tgt = self.pos(tgt)
        tgt = self.emb_dropout(tgt)
        tgt = tgt.transpose(0, 1)

        t_len = tgt.size(0)
        tgt_mask = self._tgt_mask(t_len, tgt.device)
        tgt_key_padding = (tgt_in == self.pad_idx)

        dec = self.decoder(
            tgt=tgt,
            memory=memory,
            tgt_mask=tgt_mask,
            tgt_key_padding_mask=tgt_key_padding,
        )

        dec = self.final_ln(dec)
        logits = self.out(dec).transpose(0, 1)

        return logits, tgt_out

    @torch.no_grad()
    def generate_beam(self, images: torch.Tensor, beam_size: int = 3,
                      max_len: int | None = None, length_penalty: float = 1.0) -> torch.Tensor:
        self.eval()
        if max_len is None:
            max_len = self.max_len

        batch = images.size(0)
        memory = self.encoder(images).transpose(0, 1)

        results = []
        for b in range(batch):
            mem = memory[:, b:b + 1, :]
            beams = [([self.bos_idx], 0.0)]

            for _ in range(max_len - 1):
                candidates = []

                for seq, score in beams:
                    if seq[-1] == self.eos_idx:
                        candidates.append((seq, score))
                        continue

                    seq_tensor = torch.tensor([seq], dtype=torch.long, device=images.device)
                    tgt = self.pos(self.tok_emb(seq_tensor)).transpose(0, 1)
                    tgt_mask = self._tgt_mask(len(seq), images.device)

                    dec = self.decoder(tgt=tgt, memory=mem, tgt_mask=tgt_mask)
                    dec = self.final_ln(dec)
                    logits = self.out(dec[-1, 0])
                    log_probs = F.log_softmax(logits, dim=0)

                    topk_probs, topk_idx = log_probs.topk(beam_size)

                    for prob, idx in zip(topk_probs, topk_idx):
                        new_seq = seq + [idx.item()]
                        new_score = score + prob.item()
                        candidates.append((new_seq, new_score))

                candidates = [(seq, score / (len(seq) ** length_penalty))
                              for seq, score in candidates]
                candidates.sort(key=lambda x: x[1], reverse=True)
                beams = candidates[:beam_size]

                if all(seq[-1] == self.eos_idx for seq, _ in beams):
                    break

            best_seq = beams[0][0]
            results.append(best_seq)

        max_len_seq = max(len(s) for s in results)
        output = torch.full(
            (batch, max_len_seq),
            self.pad_idx,
            dtype=torch.long,
            device=images.device,
        )
        for i, seq in enumerate(results):
            output[i, :len(seq)] = torch.tensor(seq, dtype=torch.long, device=images.device)

        return output
