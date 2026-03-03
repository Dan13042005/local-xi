// src/auth/session.ts
const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const FLASH_KEY = "auth_flash";

type JwtPayload = {
  exp?: number; // seconds since epoch
  [k: string]: unknown;
};

let logoutTimer: number | null = null;

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // base64url -> base64
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function setToken(token: string, role?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);

  // refresh auto logout timer whenever we set token
  scheduleAutoLogout(token);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);

  if (logoutTimer != null) {
    window.clearTimeout(logoutTimer);
    logoutTimer = null;
  }
}

export function setAuthFlash(message: string) {
  sessionStorage.setItem(FLASH_KEY, message);
}

export function consumeAuthFlash(): string | null {
  const msg = sessionStorage.getItem(FLASH_KEY);
  if (msg) sessionStorage.removeItem(FLASH_KEY);
  return msg;
}

export function isExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return false; // if no exp claim, treat as non-expiring

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds;
}

export function scheduleAutoLogout(token?: string | null) {
  // clear any previous timer
  if (logoutTimer != null) {
    window.clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  const t = token ?? getToken();
  if (!t) return;

  const payload = parseJwt(t);
  if (!payload?.exp) return;

  const nowMs = Date.now();
  const expMs = payload.exp * 1000;

  // log out slightly BEFORE expiry (5s) to avoid edge cases
  const msUntilLogout = Math.max(0, expMs - nowMs - 5000);

  logoutTimer = window.setTimeout(() => {
    setAuthFlash("Session expired. Please sign in again.");
    clearSession();
    window.location.href = "/login";
  }, msUntilLogout);
}