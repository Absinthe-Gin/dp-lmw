import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { getSystemSettings, updateSystemSettings } from "../lib/systemSettings";
import { createSiteAccessToken } from "../lib/auth";
import { db } from "../lib/db";

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

// Admin only: flip public/private, set a new access code, and/or set the
// storage quota threshold. Any field can be sent alone (e.g. just toggling
// isPublic without touching a previously-set code, so turning private back
// on later doesn't require re-entering the code).
settingsRouter.patch(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { isPublic, accessCode, storageQuotaBytes } = req.body as {
      isPublic?: boolean;
      accessCode?: string;
      storageQuotaBytes?: number;
    };
    const settings = await updateSystemSettings({ isPublic, accessCode, storageQuotaBytes });
    res.json({
      isPublic: settings.isPublic,
      hasAccessCode: Boolean(settings.accessCode),
      storageQuotaBytes: settings.storageQuotaBytes,
    });
  })
);

// Admin only: the system-management page's data source. storageUsedBytes
// sums Media.sizeBytes across every row regardless of trash status — a
// soft-deleted item's file is still physically sitting in the bucket until
// it's permanently purged, so it still counts against real usage.
// storageQuotaBytes is NOT pulled from the storage provider — Supabase
// Storage and Render were both checked directly and neither exposes
// account-level quota/usage via a public API — it's just the admin-set
// threshold from PATCH / above, compared against on the frontend.
settingsRouter.get(
  "/usage",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [sizeAgg, untrackedCount, mediaCount, albumCount, settings] = await Promise.all([
      db.media.aggregate({ _sum: { sizeBytes: true } }),
      db.media.count({ where: { sizeBytes: null } }),
      db.media.count({ where: { deletedAt: null } }),
      db.album.count({ where: { deletedAt: null } }),
      getSystemSettings(),
    ]);

    res.json({
      storageUsedBytes: sizeAgg._sum.sizeBytes ?? 0,
      storageQuotaBytes: settings.storageQuotaBytes,
      // Media uploaded before sizeBytes was tracked isn't counted above —
      // surfaced so the admin knows storageUsedBytes may be an undercount.
      untrackedMediaCount: untrackedCount,
      mediaCount,
      albumCount,
    });
  })
);
