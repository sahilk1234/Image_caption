"use client";

import { CaptionOut, HistoryItem } from "./types";
import { getToken, ensureGuestToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const token = getToken() || (await ensureGuestToken(API_BASE));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function captionImage(file: File): Promise<CaptionOut> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/caption`, {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as CaptionOut;
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history?limit=20&offset=0`, {
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`History failed: ${res.status}`);
  const data = (await res.json()) as HistoryItem[];
  return (data || []).map((it) => ({
    ...it,
    image_url: it.image_url ?? `${API_BASE}/images/${it.image_id}`,
  }));
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
