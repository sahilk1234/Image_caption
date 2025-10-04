Input: float32 (B,3,224,224) normalized to ImageNet mean/std.
Output: int64 token IDs (B,T). Decode with vocab.json (itos).
