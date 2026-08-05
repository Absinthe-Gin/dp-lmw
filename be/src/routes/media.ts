import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { db } from "../lib/db";
import { uploadObject, deleteObject, getSignedDownloadUrl } from "../lib/storage";
import { createThumbnail, getImageDimensions, extractExif } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import type { MediaDTO } from "@memory-vault/shared";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const mediaRouter = Router();

function toDTO(m: Awaited<ReturnType<typeof db.media.findFirstOrThrow>>): MediaDTO {
  return {
    id: m.id,
    type: m.type,
    thumbnailUrl: null, // fetched separately via /media/:id/url to avoid signing on every list call
    width: m.width,
    height: m.height,
    durationSec: m.durationSec,
    takenAt: m.takenAt?.toISOString() ?? null,
    latitude: m.latitude,
    longitude: m.longitude,
    uploadedAt: m.uploadedAt.toISOString(),
  };
}

// Public: anyone can view. Excludes trashed items.
mediaRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const media = await db.media.findMany({ where: { deletedAt: null }, orderBy: { uploadedAt: "desc" } });
    res.json(media.map(toDTO));
  })
);

// Admin only: view the trash. Listed here (not under /trash at the router
// root) so it doesn't collide with the "/:id" routes below.
mediaRouter.get(
  "/trash/list",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const media = await db.media.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } });
    res.json(media.map(toDTO));
  })
);

// Public: anyone can upload.
mediaRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file" });

    const isImage = file.mimetype.startsWith("image/");
    const key = `media/${randomUUID()}-${file.originalname}`;

    await uploadObject(key, file.buffer, file.mimetype);

    let thumbnailKey: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let exif = { takenAt: null as Date | null, latitude: null as number | null, longitude: null as number | null };

    if (isImage) {
      const thumb = await createThumbnail(file.buffer);
      thumbnailKey = `${key}-thumb.jpg`;
      await uploadObject(thumbnailKey, thumb, "image/jpeg");

      const dims = await getImageDimensions(file.buffer);
      width = dims.width;
      height = dims.height;
      exif = await extractExif(file.buffer);
    }

    const media = await db.media.create({
      data: {
        type: isImage ? "IMAGE" : "VIDEO",
        storageKey: key,
        thumbnailKey,
        width,
        height,
        takenAt: exif.takenAt,
        latitude: exif.latitude,
        longitude: exif.longitude,
      },
    });

    res.status(201).json(toDTO(media));
  })
);

// Public: anyone can view. Trashed items 404 here too — once in the
// trash, a media item is gone from every public surface, not just lists.
// ?original=1 serves the full-size storageKey instead of the thumbnail —
// used by the detail lightbox; grid thumbnails keep using the default.
mediaRouter.get(
  "/:id/url",
  asyncHandler(async (req, res) => {
    const media = await db.media.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!media) return res.status(404).json({ error: "Not found" });

    const key = req.query.original ? media.storageKey : media.thumbnailKey ?? media.storageKey;
    const url = await getSignedDownloadUrl(key);
    res.json({ url });
  })
);

// Admin only: same signed-URL lookup as /:id/url, but for trashed items —
// lets the trash UI show a real thumbnail before an admin restores or
// permanently deletes something, without exposing trashed content publicly.
mediaRouter.get(
  "/:id/trash-url",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const media = await db.media.findFirst({ where: { id: req.params.id, deletedAt: { not: null } } });
    if (!media) return res.status(404).json({ error: "Not found" });

    const key = media.thumbnailKey ?? media.storageKey;
    const url = await getSignedDownloadUrl(key);
    res.json({ url });
  })
);

// Admin only. Soft delete — moves to the trash, storage/DB row kept until
// a separate permanent-delete call. Restorable via POST /:id/restore.
mediaRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const media = await db.media.findUnique({ where: { id: req.params.id } });
    if (!media) return res.status(404).json({ error: "Not found" });

    await db.media.update({ where: { id: media.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  })
);

// Admin only: pull an item back out of the trash.
mediaRouter.post(
  "/:id/restore",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const media = await db.media.findUnique({ where: { id: req.params.id } });
    if (!media) return res.status(404).json({ error: "Not found" });

    const restored = await db.media.update({ where: { id: media.id }, data: { deletedAt: null } });
    res.json(toDTO(restored));
  })
);

// Admin only: actually destructive — deletes the object(s) from storage and
// the DB row. Only reachable from the trash UI, but not enforced server-side
// that the item must already be soft-deleted (an admin can hard-delete
// directly if they really want to).
mediaRouter.delete(
  "/:id/permanent",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const media = await db.media.findUnique({ where: { id: req.params.id } });
    if (!media) return res.status(404).json({ error: "Not found" });

    await deleteObject(media.storageKey);
    if (media.thumbnailKey) await deleteObject(media.thumbnailKey);
    await db.media.delete({ where: { id: media.id } });

    res.json({ ok: true });
  })
);
