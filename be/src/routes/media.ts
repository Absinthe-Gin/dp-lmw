import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { db } from "../lib/db";
import { uploadObject, deleteObject, getSignedDownloadUrl } from "../lib/storage";
import { createThumbnail, getImageDimensions, extractExif } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
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

// Public: anyone can view.
mediaRouter.get("/", async (_req, res) => {
  const media = await db.media.findMany({ orderBy: { uploadedAt: "desc" } });
  res.json(media.map(toDTO));
});

// Public: anyone can upload.
mediaRouter.post("/", upload.single("file"), async (req, res) => {
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
});

// Public: anyone can view.
mediaRouter.get("/:id/url", async (req, res) => {
  const media = await db.media.findUnique({ where: { id: req.params.id } });
  if (!media) return res.status(404).json({ error: "Not found" });

  const key = media.thumbnailKey ?? media.storageKey;
  const url = await getSignedDownloadUrl(key);
  res.json({ url });
});

// Admin only: destructive.
mediaRouter.delete("/:id", requireAdmin, async (req, res) => {
  const media = await db.media.findUnique({ where: { id: req.params.id } });
  if (!media) return res.status(404).json({ error: "Not found" });

  await deleteObject(media.storageKey);
  if (media.thumbnailKey) await deleteObject(media.thumbnailKey);
  await db.media.delete({ where: { id: media.id } });

  res.json({ ok: true });
});
