# backend

FastAPI backend for the O3DE Agent Control app.

## Requirements

- Python 3.11+
- pip

## Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Useful endpoints

- `GET /` — backend root status
- `GET /health` — backend health
- `POST /tools/dispatch` — structured tool dispatch stub
