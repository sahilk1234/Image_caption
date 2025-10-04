
## Quick Start

### 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Put your model artifacts:
# backend/artifacts/model_ts.pt
# backend/artifacts/vocab.json
# backend/artifacts/config.json

# Create .env (see below), then run:
uvicorn app.main:app --reload
# API: http://127.0.0.1:8000
