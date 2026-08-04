import { Router } from "express";
import { verifyAdminPassword, createAdminSessionToken } from "../lib/auth";

export const authRouter = Router();

/** The only login in this system — grants the ability to delete, nothing else. */
authRouter.post("/admin-login", (req, res) => {
  const { password } = req.body as { password?: string };

  if (!password || !verifyAdminPassword(password)) {
    return res.status(401).json({ error: "Sai mật khẩu quản trị" });
  }

  res.json({ token: createAdminSessionToken() });
});
