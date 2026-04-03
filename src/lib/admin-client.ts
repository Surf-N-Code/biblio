"use client";

const STORAGE_KEY = "biblio-admin-secret";

export function getAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminSecret(secret: string): void {
  sessionStorage.setItem(STORAGE_KEY, secret.trim());
}

export function clearAdminSecret(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function adminFetchInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  const s = getAdminSecret();
  if (s) headers.set("x-admin-secret", s);
  return { ...init, headers };
}
