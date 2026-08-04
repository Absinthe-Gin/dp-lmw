import exifr from "exifr";
import type { ExifResult } from "./types";

export async function extractExif(buffer: Buffer): Promise<ExifResult> {
  try {
    const data = await exifr.parse(buffer, { gps: true, pick: ["DateTimeOriginal", "CreateDate"] });
    return {
      takenAt: data?.DateTimeOriginal ?? data?.CreateDate ?? null,
      latitude: data?.latitude ?? null,
      longitude: data?.longitude ?? null,
    };
  } catch {
    return { takenAt: null, latitude: null, longitude: null };
  }
}
