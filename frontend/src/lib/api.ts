"use client";
import { getToken, ensureGuestToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

async function authHeaders() {
  const token = getToken() || (await ensureGuestToken(API_BASE));
  return { Authorization: `Bearer ${token}` };
}

export async function captionImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/caption`, {
    method: "POST",
    headers: await authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/history?limit=20&offset=0`, {
    method: "GET",
    headers: await authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || `History failed: ${res.status}`);
  }

  const data = await res.json();
  return (data || []).map((it: any) => ({
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
