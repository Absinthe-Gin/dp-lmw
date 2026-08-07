import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { Router } from "express";
import multer from "multer";
import archiver from "archiver";
import { db } from "../lib/db";
import { uploadObject, deleteObject, getSignedDownloadUrl, getObjectStream } from "../lib/storage";
import { attachmentDisposition } from "../lib/contentDisposition";
import { createThumbnail, getImageDimensions, extractExif } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import type { MediaDTO } from "@memory-vault/shared";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const mediaRouter = Router();

// storageKey is always `media/${randomUUID()}-${originalname}` (see the
// upload handler below) — a UUID is a fixed 36 chars, so slicing it off the
// basename recovers the original filename without needing a dedicated DB
// column for it.
export function originalFilenameFromKey(key: string): string {
  const base = key.split("/").pop() ?? key;
  return base.length > 37 ? base.slice(37) : base;
}

// Streams a zip of the given media rows' full-size files (never thumbnails)
// straight into the response — used by both the bulk-selection download and
// the single-album download below.
export async function streamZip(
  res: import("express").Response,
  zipFilename: string,
  items: { storageKey: string }[]
) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", attachmentDisposition(zipFilename));

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    // Headers are already sent by the time archiver can fail mid-stream;
    // just end the response, matching asyncHandler's crash-prevention intent.
    console.error(err);
    res.end();
  });
  archive.pipe(res);

  const seenNames = new Map<string, number>();
  for (const item of items) {
    let name = originalFilenameFromKey(item.storageKey);
    const count = seenNames.get(name) ?? 0;
    seenNames.set(name, count + 1);
    if (count > 0) {
      const dot = name.lastIndexOf(".");
      name = dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
    }
    // Resolve the stream before handing it to archiver — archiver.append
    // needs an actual Readable, not a Promise of one. getObjectStream's
    // return type is the generic NodeJS.ReadableStream interface (true for
    // both drivers at runtime, since both fs.createReadStream and the S3
    // SDK's Node Body are real Readables), so narrow it for archiver's types.
    const stream = (await getObjectStream(item.storageKey)) as unknown as Readable;
    archive.append(stream, { name });
  }

  return archive.finalize();
}

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
    let sizeBytes = file.buffer.length;

    if (isImage) {
      const thumb = await createThumbnail(file.buffer);
      thumbnailKey = `${key}-thumb.jpg`;
      await uploadObject(thumbnailKey, thumb, "image/jpeg");
      sizeBytes += thumb.length;

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
        sizeBytes,
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

// Public: same visibility rules as /:id/url, but always signs the full-size
// storageKey (never the thumbnail) and forces a Content-Disposition so
// clicking it downloads the original file with its real name instead of
// navigating to it — see storage.ts's getSignedDownloadUrl.
mediaRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const media = await db.media.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!media) return res.status(404).json({ error: "Not found" });

    const url = await getSignedDownloadUrl(media.storageKey, {
      downloadFilename: originalFilenameFromKey(media.storageKey),
    });
    res.json({ url });
  })
);

// Public: bulk download for a multi-select action on /media — zips the
// full-size files of the given (non-trashed) media ids and streams the
// archive straight into the response. Body instead of a query string
// because a selection can be large enough to blow a URL length limit.
mediaRouter.post(
  "/download-zip",
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids?: string[] };
    if (!ids?.length) return res.status(400).json({ error: "Missing ids" });

    const media = await db.media.findMany({ where: { id: { in: ids }, deletedAt: null } });
    if (!media.length) return res.status(404).json({ error: "Not found" });

    await streamZip(res, "dp-lmw-media.zip", media);
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
