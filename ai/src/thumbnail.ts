import sharp from "sharp";

const THUMBNAIL_WIDTH = 480;

export async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize({ width: THUMBNAIL_WIDTH })
    .jpeg({ quality: 75 })
    .toBuffer();
}

export async function getImageDimensions(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? null, height: meta.height ?? null };
}
