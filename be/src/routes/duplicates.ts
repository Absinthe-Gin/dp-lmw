import { Router } from "express";
import { findDuplicateGroups, computePerceptualHash } from "@memory-vault/ai";
import { db } from "../lib/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { computeContentHash } from "../lib/contentHash";
import { getObjectBuffer } from "../lib/storage";
import { toDTO } from "./media";
import type { MediaDTO } from "@memory-vault/shared";

export const duplicatesRouter = Router();

/** Sorted, joined member ids — the stable key an ignore-record is keyed on. */
function groupKeyOf(ids: string[]): string {
  return [...ids].sort().join(",");
}

/**
 * contentHash/perceptualHash are only computed at upload time (media.ts),
 * so anything uploaded before that existed has neither — meaning real
 * duplicates among older media were silently never detected. Self-heals
 * that here: re-downloads the original bytes for every row missing either
 * hash and (re-)computes it, same as upload does, so it participates in
 * detection from then on. Also picks up rows whose perceptualHash was
 * deliberately reset to null after ai/src/perceptualHash.ts's algorithm
 * changed (its old dHash-only format falsely matched any two flat-color
 * images of different hues — see the fix's commit — so every existing
 * value had to be invalidated and recomputed under the new format, not
 * just backfilled for rows that never had one). Runs at the top of GET /
 * below (both the initial page load and "Kiểm tra" call it), so the first
 * scan after a hash-format change does real work proportional to how much
 * needs recomputing and every scan after that is a no-op. A single
 * unreadable file shouldn't abort the whole scan, so failures are logged
 * and skipped rather than thrown.
 */
async function backfillMissingHashes(): Promise<void> {
  const untracked = await db.media.findMany({
    where: {
      deletedAt: null,
      OR: [{ contentHash: null }, { AND: [{ type: "IMAGE" }, { perceptualHash: null }] }],
    },
    select: { id: true, storageKey: true, type: true, contentHash: true, perceptualHash: true },
  });

  for (const m of untracked) {
    try {
      const buffer = await getObjectBuffer(m.storageKey);
      const contentHash = m.contentHash ?? computeContentHash(buffer);
      const perceptualHash = m.type === "IMAGE" ? m.perceptualHash ?? (await computePerceptualHash(buffer)) : null;
      await db.media.update({ where: { id: m.id }, data: { contentHash, perceptualHash } });
    } catch (err) {
      console.error(`[duplicates] failed to backfill hash for media ${m.id}:`, err);
    }
  }
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
    await backfillMissingHashes();

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

// Admin only: soft-deletes every id in removeIds (same trash flow as
// DELETE /api/media/:id — restorable from /trash) and keeps everything in
// keepIds untouched. keepIds is an array, not a single id — a group with
// more than 2 members can have more than one item kept (see the
// per-group UI in fe/src/app/duplicates/page.tsx), since a cluster of 3+
// "similar" items isn't necessarily all-one-photo. No separate "merge"
// data model; this just reuses soft-delete, the only removal concept
// this app has.
duplicatesRouter.post(
  "/merge",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { keepIds, removeIds } = req.body as { keepIds?: string[]; removeIds?: string[] };
    if (!keepIds?.length || !removeIds?.length) return res.status(400).json({ error: "Missing keepIds or removeIds" });

    await db.media.updateMany({
      where: { id: { in: removeIds.filter((id) => !keepIds.includes(id)) } },
      data: { deletedAt: new Date() },
    });
    res.json({ ok: true });
  })
);
