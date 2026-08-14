import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { db } from "../lib/db";
import { uploadObject, deleteObject, getSignedDownloadUrl } from "../lib/storage";
import { createThumbnail, getImageDimensions } from "@memory-vault/ai";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import type { HomeSlideDTO } from "@memory-vault/shared";

// Multi-file upload for both the individual-image picker and the
// webkitdirectory folder picker on fe/src/app/slides/page.tsx (a folder
// import is just multiple files with path info the browser already
// flattens for us — nothing folder-specific needed server-side).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const homeSlidesRouter = Router();

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".avif", ".heic", ".heif"];

// A browser's reported File.type comes from the OS's registered MIME
// associations — on Windows, a machine that has never had .webp registered
// (older Windows/no WebP codec pack) reports an empty string or
// "application/octet-stream" for a genuine .webp file, even though sharp
// decodes it fine. Falling back to the filename extension when the
// mimetype is missing/generic avoids rejecting real images purely because
// of an OS MIME-registration gap — this was reported as "webp doesn't
// upload" even though the backend always accepted a correctly-labeled
// image/webp upload (confirmed via curl).
function isAcceptableImage(file: Express.Multer.File): boolean {
  if (file.mimetype.startsWith("image/")) return true;
  if (file.mimetype === "" || file.mimetype === "application/octet-stream") {
    const lower = file.originalname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }
  return false;
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

// Storage's Content-Type should be a real image/* value (used for the
// signed URL's response headers), not whatever generic/empty type an
// under-registered OS reported — fall back to the extension when needed,
// same gap isAcceptableImage above works around.
function resolveContentType(file: Express.Multer.File): string {
  if (file.mimetype.startsWith("image/")) return file.mimetype;
  const lower = file.originalname.toLowerCase();
  const ext = IMAGE_EXTENSIONS.find((e) => lower.endsWith(e));
  return (ext && EXTENSION_CONTENT_TYPES[ext]) || "application/octet-stream";
}

function toDTO(s: Awaited<ReturnType<typeof db.homeSlide.findFirstOrThrow>>): HomeSlideDTO {
  return {
    id: s.id,
    thumbnailUrl: null, // fetched separately via /:id/url, same convention as Media
    width: s.width,
    height: s.height,
    createdAt: s.createdAt.toISOString(),
  };
}

// Public: anyone (admin or not) can see the curated slideshow.
homeSlidesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const slides = await db.homeSlide.findMany({ orderBy: { createdAt: "asc" } });
    res.json(slides.map(toDTO));
  })
);

// Public: signed URL, same ?original=1 convention as /api/media/:id/url.
homeSlidesRouter.get(
  "/:id/url",
  asyncHandler(async (req, res) => {
    const slide = await db.homeSlide.findUnique({ where: { id: req.params.id } });
    if (!slide) return res.status(404).json({ error: "Not found" });

    const key = req.query.original ? slide.storageKey : slide.thumbnailKey ?? slide.storageKey;
    const url = await getSignedDownloadUrl(key);
    res.json({ url });
  })
);

// Admin only: images-only content curation, no video (unlike /api/media).
// Accepts multiple files at once — both the plain multi-file picker and the
// webkitdirectory folder picker on the /slides admin page post here as a
// batch under the same "files" field name.
homeSlidesRouter.post(
  "/",
  requireAdmin,
  upload.array("files"),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) return res.status(400).json({ error: "Missing files" });

    const nonImage = files.find((f) => !isAcceptableImage(f));
    if (nonImage) {
      return res.status(400).json({ error: `Chỉ chấp nhận ảnh — "${nonImage.originalname}" không phải ảnh` });
    }

    const created: HomeSlideDTO[] = [];
    for (const file of files) {
      const key = `home-slides/${randomUUID()}-${file.originalname}`;
      await uploadObject(key, file.buffer, resolveContentType(file));

      const thumb = await createThumbnail(file.buffer);
      const thumbnailKey = `${key}-thumb.jpg`;
      await uploadObject(thumbnailKey, thumb, "image/jpeg");

      const dims = await getImageDimensions(file.buffer);

      const slide = await db.homeSlide.create({
        data: { storageKey: key, thumbnailKey, width: dims.width, height: dims.height },
      });
      created.push(toDTO(slide));
    }

    res.status(201).json(created);
  })
);

// Admin only: curation content, not user media — hard delete, no trash.
homeSlidesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const slide = await db.homeSlide.findUnique({ where: { id: req.params.id } });
    if (!slide) return res.status(404).json({ error: "Not found" });

    await deleteObject(slide.storageKey);
    if (slide.thumbnailKey) await deleteObject(slide.thumbnailKey);
    await db.homeSlide.delete({ where: { id: slide.id } });

    res.json({ ok: true });
  })
);
