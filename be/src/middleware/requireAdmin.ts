import type { Request, Response, NextFunction } from "express";
import { verifyAdminSessionToken } from "../lib/auth";

/** Gate only for delete endpoints — every other route in be/ is public. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Cần đăng nhập quản trị để xóa" });

  try {
    verifyAdminSessionToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn" });
  }
}
