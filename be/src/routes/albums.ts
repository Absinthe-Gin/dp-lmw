import { Router } from "express";
import { db } from "../lib/db";
import { groupByDate, generateAlbumSlideshow } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
import type { AlbumDetailDTO, AlbumDTO, MediaDTO } from "@memory-vault/shared";

export const albumsRouter = Router();

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

// Public: anyone can view.
albumsRouter.get("/", async (_req, res) => {
  const albums = await db.album.findMany({ orderBy: { createdAt: "desc" }, include: { media: true } });
  res.json(albums.map(toDTO));
});

// Public: anyone can view.
albumsRouter.get("/:id", async (req, res) => {
  const album = await db.album.findUnique({
    where: { id: req.params.id },
    include: { media: { include: { media: true } } },
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
});

// Public: anyone can create an album manually.
albumsRouter.post("/", async (req, res) => {
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
    include: { media: true },
  });

  res.status(201).json(toDTO(album));
});

// Public: anyone can edit an album (rename, add/remove items).
albumsRouter.patch("/:id", async (req, res) => {
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
    include: { media: true },
  });

  res.json(toDTO(album));
});

// Admin only: destructive.
albumsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const existing = await db.album.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.album.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

/**
 * Public: runs the AI grouping logic (ai/src/grouping.ts) over all
 * currently ungrouped media and persists the result as AUTO_DATE albums.
 * Not destructive — safe without login.
 */
albumsRouter.post("/auto-generate", async (_req, res) => {
  const ungrouped = await db.media.findMany({ where: { albums: { none: {} } } });

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
});

/**
 * Public, but currently a stub — ai/src/video.ts's slideshow generator
 * isn't implemented yet. Returns 501 until that's wired up.
 */
albumsRouter.post("/:id/video", async (req, res) => {
  const album = await db.album.findUnique({ where: { id: req.params.id }, include: { media: { include: { media: true } } } });
  if (!album) return res.status(404).json({ error: "Not found" });

  const result = await generateAlbumSlideshow(album.media.map((am) => am.media.storageKey));
  if (!result) return res.status(501).json({ error: "Tính năng tạo video đang được phát triển" });

  res.json(result);
});
