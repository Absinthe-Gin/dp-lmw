const SITE_TOKEN_KEY = "mv_site_token";

/**
 * Granted by POST /api/settings/verify-access after a correct access code,
 * when the system has been switched to private mode. Distinct from the
 * admin token in session.ts — presence of either one satisfies the
 * backend's requireSiteAccess gate (see api-client.ts).
 */
export function getSiteAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SITE_TOKEN_KEY);
}

export function setSiteAccessToken(token: string) {
  localStorage.setItem(SITE_TOKEN_KEY, token);
}

export function clearSiteAccessToken() {
  localStorage.removeItem(SITE_TOKEN_KEY);
}
