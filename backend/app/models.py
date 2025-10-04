from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, LargeBinary  
from sqlmodel import SQLModel, Field
from pydantic import BaseModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    anon_id: Optional[str] = Field(default=None, index=True)
    filename: str
    mime: str
    width: Optional[int] = None
    height: Optional[int] = None
    data: Optional[bytes] = Field(default=None, sa_column=Column(LargeBinary))  # <-- needed
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Caption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_id: int = Field(foreign_key="image.id")
    text: str
    alt_text: Optional[str] = None
    model_version: Optional[str] = None
    latency_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HistoryItem(BaseModel):
    id: int
    image_id: int                     
    image_filename: str
    image_url: Optional[str] = None
    caption: str
    created_at: str
    model_config = {"protected_namespaces": ()}
