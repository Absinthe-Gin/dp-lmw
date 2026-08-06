import { Router } from "express";
import { db } from "../lib/db";
import { groupByDate, generateAlbumSlideshow } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { streamZip } from "./media";
import { getSignedDownloadUrl } from "../lib/storage";
import type { AlbumDetailDTO, AlbumDTO, MediaDTO } from "@memory-vault/shared";

export const albumsRouter = Router();

// Excludes soft-deleted media from an album's nested `media` relation —
// used both to count `mediaCount` and to build the detail response, so a
// trashed item disappears from every album it was in immediately.
const NOT_TRASHED_MEDIA = { where: { media: { deletedAt: null } } };

function toDTO(album: { id: string; title: string; description: string | null; source: string; createdAt: Date; media: unknown[] }): AlbumDTO {
  return {
    id: album.id,
    title: album.title,
    description: album.description,
    source: album.source as AlbumDTO["source"],
    createdAt: album.createdAt.toISOString(),
    mediaCount: album.media.length,
  };
}

// Public: anyone can view. Excludes trashed albums.
albumsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const albums = await db.album.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { media: NOT_TRASHED_MEDIA },
    });
    res.json(albums.map(toDTO));
  })
);

// Admin only: view the trash.
albumsRouter.get(
  "/trash/list",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const albums = await db.album.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { media: true },
    });
    res.json(albums.map(toDTO));
  })
);

// Public: anyone can view. Trashed albums 404 here too.
albumsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const album = await db.album.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { media: { where: { media: { deletedAt: null } }, include: { media: true } } },
    });
    if (!album) return res.status(404).json({ error: "Not found" });

    const detail: AlbumDetailDTO = {
      ...toDTO(album),
      media: album.media.map(
        (am): MediaDTO => ({
          id: am.media.id,
          type: am.media.type,
          thumbnailUrl: null,
          width: am.media.width,
          height: am.media.height,
          durationSec: am.media.durationSec,
          takenAt: am.media.takenAt?.toISOString() ?? null,
          latitude: am.media.latitude,
          longitude: am.media.longitude,
          uploadedAt: am.media.uploadedAt.toISOString(),
        })
      ),
    };
    res.json(detail);
  })
);

// Public: same visibility as the detail route above. Signs a thumbnail URL
// for the album's cover — always the earliest-added non-trashed item
// (by AlbumMedia.addedAt), computed live rather than off the album's
// `coverKey` column, so removing the current cover item or reordering never
// leaves a stale cover behind. Returns { url: null } for an empty album.
albumsRouter.get(
  "/:id/cover-url",
  asyncHandler(async (req, res) => {
    const album = await db.album.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!album) return res.status(404).json({ error: "Not found" });

    const first = await db.albumMedia.findFirst({
      where: { albumId: req.params.id, media: { deletedAt: null } },
      orderBy: { addedAt: "asc" },
      include: { media: true },
    });
    if (!first) return res.json({ url: null });

    const key = first.media.thumbnailKey ?? first.media.storageKey;
    const url = await getSignedDownloadUrl(key);
    res.json({ url });
  })
);

// Public: same visibility as the detail route above — zips every
// non-trashed media item's full-size file and streams it down as
// "<album title>.zip". Reuses media.ts's streamZip so the naming/dedup
// logic for the archive entries lives in exactly one place.
albumsRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const album = await db.album.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { media: { where: { media: { deletedAt: null } }, include: { media: true } } },
    });
    if (!album) return res.status(404).json({ error: "Not found" });
    if (!album.media.length) return res.status(404).json({ error: "Album trống" });

    const sanitizedTitle = album.title.replace(/[\\/:*?"<>|]/g, "").trim() || "album";
    await streamZip(res, `${sanitizedTitle}.zip`, album.media.map((am) => am.media));
  })
);

// Public: anyone can create an album manually.
albumsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, description, mediaIds } = req.body as {
      title?: string;
      description?: string;
      mediaIds?: string[];
    };
    if (!title) return res.status(400).json({ error: "Missing title" });

    const album = await db.album.create({
      data: {
        title,
        description,
        source: "MANUAL",
        media: { create: (mediaIds ?? []).map((mediaId) => ({ mediaId })) },
      },
      include: { media: NOT_TRASHED_MEDIA },
    });

    res.status(201).json(toDTO(album));
  })
);

// Public: anyone can edit an album (rename, add/remove items).
albumsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { title, description, addMediaIds, removeMediaIds } = req.body as {
      title?: string;
      description?: string;
      addMediaIds?: string[];
      removeMediaIds?: string[];
    };

    const existing = await db.album.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (addMediaIds?.length) {
      await db.albumMedia.createMany({
        data: addMediaIds.map((mediaId) => ({ albumId: req.params.id, mediaId })),
        skipDuplicates: true,
      });
    }
    if (removeMediaIds?.length) {
      await db.albumMedia.deleteMany({ where: { albumId: req.params.id, mediaId: { in: removeMediaIds } } });
    }

    const album = await db.album.update({
      where: { id: req.params.id },
      data: { title, description },
      include: { media: NOT_TRASHED_MEDIA },
    });

    res.json(toDTO(album));
  })
);

// Admin only. Soft delete — moves to the trash. Restorable via POST /:id/restore.
albumsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await db.album.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await db.album.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  })
);

// Admin only: pull an album back out of the trash.
albumsRouter.post(
  "/:id/restore",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await db.album.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const restored = await db.album.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
      include: { media: true },
    });
    res.json(toDTO(restored));
  })
);

// Admin only: actually destructive — deletes the album (and, via cascade,
// its AlbumMedia rows — the underlying Media rows themselves are untouched).
albumsRouter.delete(
  "/:id/permanent",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await db.album.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await db.album.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

/**
 * Public: runs the AI grouping logic (ai/src/grouping.ts) over all
 * currently ungrouped media and persists the result as AUTO_DATE albums.
 * Not destructive — safe without login.
 */
albumsRouter.post(
  "/auto-generate",
  asyncHandler(async (_req, res) => {
    const ungrouped = await db.media.findMany({ where: { deletedAt: null, albums: { none: {} } } });

    // EXIF-less media (screenshots, re-exported files) has no takenAt — fall
    // back to uploadedAt so it still participates in grouping instead of
    // being silently dropped by groupByDate's `filter((m) => m.takenAt)`.
    const withFallbackDate = ungrouped.map((m) => ({ ...m, takenAt: m.takenAt ?? m.uploadedAt }));
    const groups = groupByDate(withFallbackDate);
    const created: AlbumDTO[] = [];

    for (const group of groups) {
      const first = group[0].takenAt!;
      const album = await db.album.create({
        data: {
          title: first.toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }),
          source: "AUTO_DATE",
          coverKey: group[0].thumbnailKey ?? group[0].storageKey,
          media: { create: group.map((m) => ({ mediaId: m.id })) },
        },
        include: { media: true },
      });
      created.push(toDTO(album));
    }

    res.json({ created: created.length, albums: created });
  })
);

/**
 * Public, but currently a stub — ai/src/video.ts's slideshow generator
 * isn't implemented yet. Returns 501 until that's wired up.
 */
albumsRouter.post(
  "/:id/video",
  asyncHandler(async (req, res) => {
    const album = await db.album.findUnique({ where: { id: req.params.id }, include: { media: { include: { media: true } } } });
    if (!album) return res.status(404).json({ error: "Not found" });

    const result = await generateAlbumSlideshow(album.media.map((am) => am.media.storageKey));
    if (!result) return res.status(501).json({ error: "Tính năng tạo video đang được phát triển" });

    res.json(result);
  })
);
