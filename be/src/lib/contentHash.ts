import { createHash } from "node:crypto";

/**
 * SHA-256 of the raw uploaded bytes — used for exact-duplicate detection
 * (be/src/routes/duplicates.ts). Two uploads of literally the same file
 * (even under a different name) land on the same hash. For visually
 * similar-but-not-identical images (re-compressed, resized, lightly
 * edited), see ai/src/perceptualHash.ts instead.
 */
export function computeContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
