import sharp from "sharp";

const HASH_SIZE = 8; // 8x8 grid -> 64 bits

/**
 * "Difference hash" (dHash): shrink the image to a tiny grayscale grid and
 * encode, per pixel, whether it's darker than its right neighbor. Small
 * edits — recompression, minor crop, resize, thumbnailing — barely change
 * the result, which is what makes this useful for near-duplicate detection
 * (be/src/routes/duplicates.ts compares these via Hamming distance, see
 * duplicates.ts's findDuplicateGroups). Unlike be/src/lib/contentHash.ts's
 * SHA-256, this only makes sense for images — no video equivalent here.
 * Returns a 16-char hex string (64 bits).
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .rotate() // apply EXIF orientation so a rotated re-upload still hashes the same
    .resize(HASH_SIZE + 1, HASH_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      const left = data[row * (HASH_SIZE + 1) + col];
      const right = data[row * (HASH_SIZE + 1) + col + 1];
      bits += left < right ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart((HASH_SIZE * HASH_SIZE) / 4, "0"); // 64 bits -> 16 hex chars
}

/** Hamming distance between two hashes of the same length (in hex chars, each nibble = 4 bits). */
export function hammingDistance(hexA: string, hexB: string): number {
  let x = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}
