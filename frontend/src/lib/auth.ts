"use client";

import Cookies from "js-cookie";

export type AuthUser = {
  id: string | number;
  email: string | null;
  name: string | null;
  guest?: boolean;
};

const TOKEN_KEY = "ic_token";         
const USER_KEY  = "ic_user";           
const ONE_DAY = 1;                      

/* ========== Token helpers ========== */
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return Cookies.get(TOKEN_KEY) || "";
}

export function setToken(t: string) {
  if (typeof window === "undefined") return;
  Cookies.set(TOKEN_KEY, t, {
    expires: ONE_DAY,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearToken() {
  if (typeof window === "undefined") return;
  Cookies.remove(TOKEN_KEY, { path: "/" });
}

/* ========== User helpers ========== */
export function setAuth(access: string, user: AuthUser) {
  setToken(access);
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? (JSON.parse(raw) as AuthUser) : null; } catch { return null; }
}

export function clearAuth() {
  clearToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
}

export function isGuest(u: AuthUser | null): boolean {
  return !!u && (!!u.guest || String(u.id).startsWith("guest-"));
}

/* ========== Guest bootstrap ========== */
export async function ensureGuestAuth(apiBase: string): Promise<{ access: string; user: AuthUser }> {
  const existing = getToken();
  const cachedUser = getUser();
  if (existing && cachedUser) return { access: existing, user: cachedUser };

  const res = await fetch(`${apiBase}/auth/guest`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Guest login failed");
  const json = await res.json();
  if (!json?.access) throw new Error("No token in guest response");

  const user: AuthUser = json.user ?? { id: "guest", email: null, name: "Guest", guest: true };
  setAuth(json.access, { ...user, guest: true });
  return { access: json.access, user: { ...user, guest: true } };
}

/* ========== Fetch helpers ========== */
export function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const t = getToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(input, { ...init, headers, credentials: "include" });
}

export async function ensureGuestToken(apiBase: string): Promise<string> {
  const { access } = await ensureGuestAuth(apiBase);
  return access;
}
