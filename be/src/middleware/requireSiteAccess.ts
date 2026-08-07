import type { Request, Response, NextFunction } from "express";
import { getSystemSettings } from "../lib/systemSettings";
import { verifyAnyAccessToken } from "../lib/auth";

// Must stay reachable even while the system is private, or the gate becomes
// a lock with no key: the frontend needs public-status to know whether to
// even show the code prompt, verify-access is the only way a regular
// visitor gets past it, and admin-login is how an admin gets in to turn
// the whole thing back off. /files/* is the "local" storage driver's
// unsigned static route (dev-only — s3 in production, see storage.ts) and
// is left open for the same reason S3 signed URLs aren't re-checked here:
// this gate protects discovery of the app, not already-issued file links.
const ALWAYS_ALLOWED = ["/health", "/api/auth/admin-login", "/api/settings/public-status", "/api/settings/verify-access"];

function isAlwaysAllowed(path: string): boolean {
  return ALWAYS_ALLOWED.includes(path) || path.startsWith("/files/");
}

/**
 * Global gate mounted in server.ts ahead of every router. A no-op whenever
 * SystemSettings.isPublic is true (the default posture before this feature
 * existed, and the common case) — only blocks when an admin has explicitly
 * switched the system to private via PATCH /api/settings.
 */
export async function requireSiteAccess(req: Request, res: Response, next: NextFunction) {
  if (isAlwaysAllowed(req.path)) return next();

  const settings = await getSystemSettings();
  if (settings.isPublic) return next();

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Hệ thống đang ở chế độ riêng tư — cần mã truy cập" });

  try {
    verifyAnyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Mã truy cập không hợp lệ hoặc đã hết hạn" });
  }
}
