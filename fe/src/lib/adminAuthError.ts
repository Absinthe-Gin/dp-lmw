import { ApiError } from "./api-client";

/**
 * True if `error` is an ApiError for a 401 — the admin token is missing,
 * invalid, or expired (JWTs from lib/auth.ts's createAdminSessionToken last
 * 12h). Pages that poll an admin-only endpoint (fe/src/app/{system,access}
 * /page.tsx) check this in their poll's .catch() so an expired session
 * bounces back to /admin-login instead of silently failing every poll tick
 * forever with nothing but a console error to show for it.
 */
export function isAdminUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
