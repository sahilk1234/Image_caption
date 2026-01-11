# Image Captioning - Model

This folder holds the training notebooks, data, and exported artifacts used by the backend.

## Contents
- model.ipynb - main training and evaluation notebook
- model-Copy1.ipynb - alternate notebook copy
- data/Images - image dataset used by the notebooks
- data/captions.txt - caption file used by the notebooks
- artifacts/ - exported model files for inference and training

## Artifacts
- config.json - model and preprocessing config
- vocab.json - token mappings
- weights.pt / best_model.pt - training checkpoints
- model_ts.pt - TorchScript model used by the backend

See `model/artifacts/README.md` for model details and a usage snippet.

## Using artifacts with the backend
By default the backend reads artifacts from `backend/artifacts`:

- model_ts.pt (required)
- vocab.json
- config.json

Copy files from `model/artifacts` or set `MODEL_TS`, `VOCAB_JSON`, and `CONFIG_JSON` to point to them.
