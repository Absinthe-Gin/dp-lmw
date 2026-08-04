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
