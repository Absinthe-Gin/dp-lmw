import { Router } from "express";
import { findDuplicateGroups } from "@memory-vault/ai";
import { db } from "../lib/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { toDTO } from "./media";
import type { MediaDTO } from "@memory-vault/shared";

export const duplicatesRouter = Router();

/** Sorted, joined member ids — the stable key an ignore-record is keyed on. */
function groupKeyOf(ids: string[]): string {
  return [...ids].sort().join(",");
}

// Public: anyone can view, matching this app's "viewing needs no login"
// rule — merging (destructive) is admin-only below, dismissing isn't.
// Detection runs fresh on every call rather than being pre-computed/cached
// anywhere: contentHash/perceptualHash comparisons are cheap at this app's
// scale (same "naive O(n²), fine for personal-library sizes" trade-off
// ai/src/grouping.ts's groupByLocation already makes), and a stored/cached
// result would need its own invalidation logic every time media is
// added/removed — not worth it here.
duplicatesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const media = await db.media.findMany({
      where: { deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });

    const groups = findDuplicateGroups(
      media.map((m) => ({ id: m.id, contentHash: m.contentHash, perceptualHash: m.perceptualHash }))
    );

    const ignored = await db.ignoredDuplicateGroup.findMany({
      where: { groupKey: { in: groups.map((g) => groupKeyOf(g.map((m) => m.id))) } },
    });
    const ignoredKeys = new Set(ignored.map((i) => i.groupKey));

    const byId = new Map(media.map((m) => [m.id, m]));
    const result: MediaDTO[][] = groups
      .filter((g) => !ignoredKeys.has(groupKeyOf(g.map((m) => m.id))))
      .map((g) => g.map((m) => toDTO(byId.get(m.id)!)));

    res.json({ groups: result });
  })
);

// Public: "Giữ nguyên" — dismisses a group without touching any media.
// Not admin-gated since nothing is deleted; matches the rest of this app's
// "only deletion needs login" rule.
duplicatesRouter.post(
  "/dismiss",
  asyncHandler(async (req, res) => {
    const { mediaIds } = req.body as { mediaIds?: string[] };
    if (!mediaIds?.length) return res.status(400).json({ error: "Missing mediaIds" });

    await db.ignoredDuplicateGroup.upsert({
      where: { groupKey: groupKeyOf(mediaIds) },
      create: { groupKey: groupKeyOf(mediaIds) },
      update: {},
    });
    res.json({ ok: true });
  })
);

// Admin only: "Gộp làm 1" — soft-deletes every id in removeIds (same trash
// flow as DELETE /api/media/:id — restorable from /trash) and keeps keepId
// untouched. No separate "merge" data model; this just reuses soft-delete,
// since that's the only removal concept this app has.
duplicatesRouter.post(
  "/merge",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { keepId, removeIds } = req.body as { keepId?: string; removeIds?: string[] };
    if (!keepId || !removeIds?.length) return res.status(400).json({ error: "Missing keepId or removeIds" });

    await db.media.updateMany({
      where: { id: { in: removeIds.filter((id) => id !== keepId) } },
      data: { deletedAt: new Date() },
    });
    res.json({ ok: true });
  })
);
