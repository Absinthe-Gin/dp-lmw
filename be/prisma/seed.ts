/**
 * Dev-only sample data so a fresh vault isn't empty. Generates real JPEG
 * bytes and pushes them through the same storage abstraction the real
 * upload route uses (be/src/lib/storage.ts) — so this works identically
 * whether STORAGE_DRIVER is "local" (writes to be/uploads/) or "s3"
 * (writes to the real R2/S3 bucket), instead of hardcoding a filesystem
 * path. Inserts Media rows across two takenAt clusters a few months
 * apart, so pressing "Gộp tự động" on /albums immediately demonstrates
 * real grouping instead of showing an empty state.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { uploadObject } from "../src/lib/storage";

const db = new PrismaClient();

const SEED_PHOTOS = [
  { name: "seed-sapa-1", color: { r: 27, g: 76, b: 168 }, takenAt: new Date("2026-07-12T08:00:00Z") },
  { name: "seed-sapa-2", color: { r: 91, g: 147, b: 232 }, takenAt: new Date("2026-07-12T09:30:00Z") },
  { name: "seed-dalat-1", color: { r: 14, g: 47, b: 115 }, takenAt: new Date("2026-03-02T14:00:00Z") },
  { name: "seed-dalat-2", color: { r: 143, g: 178, b: 230 }, takenAt: new Date("2026-03-02T16:15:00Z") },
];

async function main() {
  const already = await db.media.findFirst({ where: { storageKey: { startsWith: "media/seed-" } } });
  if (already) {
    console.log("Seed data already present — skipping.");
    return;
  }

  for (const photo of SEED_PHOTOS) {
    const key = `media/${photo.name}.jpg`;
    const thumbKey = `${key}-thumb.jpg`;

    const original = await sharp({ create: { width: 900, height: 600, channels: 3, background: photo.color } })
      .jpeg()
      .toBuffer();
    await uploadObject(key, original, "image/jpeg");

    const thumb = await sharp(original).resize({ width: 480 }).jpeg({ quality: 75 }).toBuffer();
    await uploadObject(thumbKey, thumb, "image/jpeg");

    await db.media.create({
      data: { type: "IMAGE", storageKey: key, thumbnailKey: thumbKey, width: 900, height: 600, takenAt: photo.takenAt },
    });
  }

  console.log(`Seeded ${SEED_PHOTOS.length} sample photos (driver: ${process.env.STORAGE_DRIVER === "s3" ? "s3" : "local"}). Open /albums and press "Gộp tự động" to group them.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
