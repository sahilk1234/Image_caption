"use client";

import { CaptionOut, HistoryItem } from "./types";
import { getToken, ensureGuestToken } from "./auth";
import { getApiBase } from "./apiBase";

const API_BASE = getApiBase();

async function authHeaders(): Promise<Record<string, string>> {
  const token = getToken() || (await ensureGuestToken(API_BASE));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail))
      return data.detail.map((d: { msg?: string }) => d?.msg || "").join(", ");
    if (typeof data?.message === "string") return data.message;
  } catch {}
  try {
    const text = await res.text();
    if (text) return text;
  } catch {}
  return `Request failed (${res.status})`;
}

export async function captionImage(file: File): Promise<CaptionOut> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/caption`, {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as CaptionOut;
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/history?limit=20&offset=0`, {
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as HistoryItem[];
  const base = API_BASE.replace(/\/$/, "");
  return (data || []).map((it) => ({
    ...it,
    image_url: `${base}/images/${it.image_id}`,
  }));
}
