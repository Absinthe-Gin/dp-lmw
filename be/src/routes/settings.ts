import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { getSystemSettings, updateSystemSettings } from "../lib/systemSettings";
import { createSiteAccessToken } from "../lib/auth";

export const settingsRouter = Router();

// Public, always reachable (see requireSiteAccess's allowlist) — the
// frontend calls this on every load to decide whether to show the
// access-code gate at all, before it knows if it's allowed to call
// anything else. Never returns the code itself, only whether one is set.
settingsRouter.get(
  "/public-status",
  asyncHandler(async (_req, res) => {
    const settings = await getSystemSettings();
    res.json({ isPublic: settings.isPublic, hasAccessCode: Boolean(settings.accessCode) });
  })
);

// Public, always reachable — deliberately NOT admin-gated: gating it would
// be circular, since the whole point is letting a non-admin get past the
// gate. verify-access. Wrong/missing code -> 401, no other information leaked.
settingsRouter.post(
  "/verify-access",
  asyncHandler(async (req, res) => {
    const { code } = req.body as { code?: string };
    const settings = await getSystemSettings();
    if (!settings.accessCode || !code || code !== settings.accessCode) {
      return res.status(401).json({ error: "Mã truy cập không đúng" });
    }
    res.json({ token: createSiteAccessToken() });
  })
);

// Admin only: flip public/private and/or set a new access code. Either
// field can be sent alone (e.g. just toggling isPublic without touching a
// previously-set code, so turning private back on later doesn't require
// re-entering the code).
settingsRouter.patch(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { isPublic, accessCode } = req.body as { isPublic?: boolean; accessCode?: string };
    const settings = await updateSystemSettings({ isPublic, accessCode });
    res.json({ isPublic: settings.isPublic, hasAccessCode: Boolean(settings.accessCode) });
  })
);
