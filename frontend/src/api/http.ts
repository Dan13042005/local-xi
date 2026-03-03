// src/api/http.ts
import { clearSession, getToken, isExpired } from "../auth/session";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080") as string;

type ApiFetchOptions = RequestInit & {
  // if true, we do NOT auto-redirect on auth failure
  suppressAuthRedirect?: boolean;
};

function authFailed(status: number) {
  return status === 401 || status === 403;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = getToken();

  // client-side expiry check
  if (token && isExpired(token)) {
    clearSession();
    if (!options.suppressAuthRedirect) window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  // Only set Content-Type if we have a body and it's not FormData
  const hasBody = options.body != null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (authFailed(res.status)) {
    clearSession();
    if (!options.suppressAuthRedirect) window.location.href = "/login";
    throw new Error("Not authorised. Please sign in again.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }

  // fallback for text/plain responses
  return (await res.text()) as unknown as T;
}