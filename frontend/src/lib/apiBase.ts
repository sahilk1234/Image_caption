"use client";

export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env && env.trim()) return env.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const host = window.location.host;
  if (host.startsWith("localhost:3000") || host.startsWith("127.0.0.1:3000")) {
    return "http://127.0.0.1:8000";
  }

  return `${window.location.origin}/api`;
}
