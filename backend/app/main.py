from __future__ import annotations
import io
from datetime import datetime, timedelta

import logging
from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from sqlmodel import Session, select

from .db import init_db, get_session
from .models import Image as DBImage, Caption as DBCaption
from .schemas import CaptionOut, HistoryItem
from .utils import get_identity
from .inference import caption_image
from .auth import router as auth_router

app = FastAPI(title="Image Captioning API", version="0.1.0")
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    init_db()

# Auth endpoints (/auth/guest, /auth/login, /auth/register)
app.include_router(auth_router)

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/caption", response_model=CaptionOut, tags=["caption"])
def caption(
    file: UploadFile = File(...),
    ids = Depends(get_identity),           
    session: Session = Depends(get_session),
):
    user_id, anon_id = ids
    print(f"[caption] identity => user_id={user_id} anon_id={anon_id}")  

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
        width, height = pil.size
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    try:
        text, latency_ms, model_version = caption_image(pil)
    except FileNotFoundError as exc:
        logger.exception("Model artifacts missing")
        raise HTTPException(status_code=503, detail="Model artifacts not available") from exc
    except (RuntimeError, MemoryError) as exc:
        msg = str(exc)
        if "LFS" in msg or "TorchScript" in msg or "weights.pt" in msg:
            logger.exception("Model unavailable")
            raise HTTPException(status_code=503, detail="Model unavailable") from exc
        logger.exception("Captioning failed")
        raise HTTPException(status_code=500, detail="Captioning failed") from exc
    except Exception as exc:
        logger.exception("Captioning failed")
        raise HTTPException(status_code=500, detail="Captioning failed") from exc

    # Persist only if we have some identity (guest or user)
    if user_id or anon_id:
        mime = file.content_type or "image/jpeg"

        img = DBImage(
            user_id=user_id,
            anon_id=anon_id,
            filename=file.filename or "upload",
            mime=mime,
            width=width,
            height=height,
            data=raw,  
        )
        session.add(img)
        session.commit()
        session.refresh(img)

        cap = DBCaption(
            image_id=img.id,
            text=text,
            model_version=model_version,
            latency_ms=latency_ms,
        )
        session.add(cap)
        session.commit()
        session.refresh(cap)

        return CaptionOut(
            caption=text,
            model_version=model_version,
            latency_ms=latency_ms,
            image_id=img.id,
            caption_id=cap.id,
        )

    return CaptionOut(
        caption=text,
        model_version=model_version,
        latency_ms=latency_ms,
        image_id=0,
        caption_id=0,
    )

@app.get("/history", response_model=list[HistoryItem], tags=["history"])
def history(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    ids = Depends(get_identity),
    session: Session = Depends(get_session),
):
    user_id, anon_id = ids
    if not user_id and not anon_id:
        return []

    q = select(DBCaption, DBImage).join(DBImage, DBCaption.image_id == DBImage.id)

    if user_id:
        q = q.where(DBImage.user_id == user_id)
    else:
        cutoff = datetime.utcnow() - timedelta(days=1)
        q = q.where(DBImage.anon_id == anon_id, DBImage.created_at >= cutoff)

    rows = session.exec(
        q.order_by(DBCaption.created_at.desc()).offset(offset).limit(limit)
    ).all()

    out: list[HistoryItem] = []
    for cap, img in rows:
        img_url = None
        if img.data:
            try:
                img_url = str(request.url_for("get_image", image_id=img.id))
            except Exception:
                img_url = None

        out.append(
            HistoryItem(
                id=cap.id,
                image_id=img.id,
                image_filename=img.filename,
                image_url=img_url,
                caption=cap.text,
                created_at=cap.created_at.isoformat(),
            )
        )
    return out

@app.get("/images/{image_id}", tags=["images"])
def get_image(image_id: int, session: Session = Depends(get_session)):
    img = session.get(DBImage, image_id)
    if not img or not img.data:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=img.data, media_type=img.mime)
