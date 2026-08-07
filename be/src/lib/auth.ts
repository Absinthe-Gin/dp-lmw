import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD as string;

/**
 * Single shared admin password, not per-account login — this system has
 * no user accounts. Only destructive delete endpoints require the
 * resulting session token; everything else (view/upload/edit) is public.
 */
export function verifyAdminPassword(password: string): boolean {
  return password.length > 0 && password === ADMIN_PASSWORD;
}

export function createAdminSessionToken(): string {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyAdminSessionToken(token: string): void {
  const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
  if (payload.role !== "admin") throw new Error("Not an admin session");
}

/**
 * Granted by POST /api/settings/verify-access after a correct access code —
 * this is the "I'm a regular visitor who got past the private-mode gate"
 * token, distinct from the admin session above. Long-lived (30 days) since
 * re-entering a code on every visit would defeat the point of a low-friction
 * shared-vault app; an admin token satisfies the same gate too (see
 * verifyAnyAccessToken), so an admin never needs this one.
 */
export function createSiteAccessToken(): string {
  return jwt.sign({ role: "site-guest" }, JWT_SECRET, { expiresIn: "30d" });
}

/** Used by requireSiteAccess — accepts either an admin session or a site-access token. */
export function verifyAnyAccessToken(token: string): void {
  const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
  if (payload.role !== "admin" && payload.role !== "site-guest") {
    throw new Error("Not a valid access token");
  }
}
