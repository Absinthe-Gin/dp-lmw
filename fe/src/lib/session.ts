const TOKEN_KEY = "mv_admin_token";

/** Presence of this token means "can delete" — nothing else in the app checks it. */
export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
}
