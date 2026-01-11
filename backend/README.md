# Image Captioning - Backend

FastAPI service for captioning images, auth, and history storage.

## Requirements
- Python 3.10+
- PyTorch + torchvision (CPU or GPU)
- Optional: Postgres (set DATABASE_URL)

## Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install torch/torchvision for your platform (CPU example)
pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
```

## Configuration
Copy the example env file and adjust as needed:
```bash
cp .env.example .env
```

Model artifacts (TorchScript preferred; eager weights supported):
```bash
mkdir -p artifacts
cp ../model/artifacts/model_ts.pt artifacts/
cp ../model/artifacts/vocab.json artifacts/
cp ../model/artifacts/config.json artifacts/
cp ../model/artifacts/weights.pt artifacts/
```

Run the server:
```bash
uvicorn app.main:app --reload
# API: http://127.0.0.1:8000
```

## Environment Variables
- DATABASE_URL=sqlite:///./imgcap.db
- JWT_SECRET=change-me
- JWT_EXPIRE_MINUTES=43200
- MODEL_TS=artifacts/model_ts.pt
- VOCAB_JSON=artifacts/vocab.json
- CONFIG_JSON=artifacts/config.json
- WEIGHTS_PT=artifacts/weights.pt (used for eager fallback if TorchScript is missing or CUDA-baked)
- IMG_SIZE=224

## API
- POST /auth/guest
- POST /auth/register
- POST /auth/login
- POST /caption (multipart form field: file)
- GET /history?limit=20&offset=0
- GET /images/{image_id}
- GET /healthz

## Notes
- SQLite data is stored in `backend/imgcap.db` by default. Delete the file to reset local data.
- CORS allows http://localhost:3000 and http://127.0.0.1:3000.
- Inference prefers TorchScript `model_ts.pt`; if it is missing or CUDA-baked on a CPU host, the backend loads `weights.pt` eagerly.
