"use client";

import * as React from "react";
import {
  getUser,
  setAuth,
  clearAuth,
  ensureGuestAuth,
  type AuthUser,
} from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AuthReturn = {
  user: AuthUser | null;
  loading: boolean;
  isGuest: boolean;
  ensureGuest: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
};

export function useAuth(): AuthReturn {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const computeIsGuest = React.useCallback(
    (u: AuthUser | null) => !u || !!u.guest || String(u.id).startsWith("guest-"),
    []
  );

  const refresh = React.useCallback(() => {
    setUser(getUser());
  }, []);

  const ensureGuest = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ensureGuestAuth(API_BASE);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // we merge guest history server-side via cookie
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json(); // { access, user }
      setAuth(json.access, { ...json.user, guest: false });
      setUser({ ...json.user, guest: false });
      window.dispatchEvent(new Event("ic-auth-changed"));
    } finally {
      setLoading(false);
    }
  }, []);

  const register = React.useCallback(
    async (email: string, password: string, name?: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // merge guest history on register too
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setAuth(json.access, { ...json.user, guest: false });
        setUser({ ...json.user, guest: false });
        window.dispatchEvent(new Event("ic-auth-changed"));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = React.useCallback(() => {
    clearAuth();
    setUser({ id: "guest", email: null, name: "Guest", guest: true });
    window.dispatchEvent(new Event("ic-auth-changed"));
  }, []);

  // boot: try cache, else ensure guest
  React.useEffect(() => {
    const cached = getUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    } else {
      ensureGuest();
    }
  }, [ensureGuest]);

  // keep in sync across tabs and local updates
  React.useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("storage", onChange);
    window.addEventListener("ic-auth-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("ic-auth-changed", onChange);
    };
  }, [refresh]);

  return {
    user,
    loading,
    isGuest: computeIsGuest(user),
    ensureGuest,
    login,
    register,
    logout,
    refresh,
  };
}
