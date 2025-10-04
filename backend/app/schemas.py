from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None
    model_config = {"protected_namespaces": ()}

class LoginIn(BaseModel):
    email: EmailStr
    password: str
    model_config = {"protected_namespaces": ()}

class TokenOut(BaseModel):
    access: str
    model_config = {"protected_namespaces": ()}

class CaptionOut(BaseModel):
    caption: str
    model_version: Optional[str] = None
    latency_ms: int
    image_id: int
    caption_id: int
    model_config = {"protected_namespaces": ()}

class HistoryItem(BaseModel):
    id: int
    image_id: Optional[int] = None
    image_filename: Optional[str] = None
    image_url: Optional[str] = None
    caption: str
    created_at: str
    model_config = {"protected_namespaces": ()}

