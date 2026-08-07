import sharp from "sharp";

const HASH_SIZE = 8; // 8x8 grid -> 64 bits for the structural (dHash) component
const DHASH_MAX_DISTANCE = 8; // out of 64 bits — recompression/minor crop/resize tolerance
const AVG_LUMA_MAX_DIFF = 12; // out of 255 — recompression/resize brightness-shift tolerance

/**
 * Combined perceptual fingerprint for images: a 64-bit "difference hash"
 * (dHash) — shrink to a tiny grayscale grid and encode whether each pixel
 * is darker than its right neighbor — plus a 1-byte average luminance.
 *
 * dHash alone is blind to overall color/brightness: a perfectly flat,
 * uniform-color region (a solid background, a blank screenshot area) has
 * no left-right gradient anywhere, so it hashes to the same all-zero
 * bitstring regardless of what that color actually is — an all-red photo
 * and an all-green photo would come out perceptually identical and get
 * wrongly clustered as duplicates. The appended luminance byte catches
 * that case (real near-duplicates barely shift average brightness after
 * recompression/resize, comfortably inside AVG_LUMA_MAX_DIFF; a
 * different-colored flat image usually shifts it by far more) without
 * needing a heavier fix like hashing actual color channels.
 *
 * Returns an 18-char hex string: 16 chars dHash + 2 chars average luma.
 * Compare two outputs with areSimilar, not raw Hamming distance — the
 * luma byte needs its own (non-bitwise) tolerance check.
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
  const dHash = BigInt(`0b${bits}`).toString(16).padStart((HASH_SIZE * HASH_SIZE) / 4, "0"); // 64 bits -> 16 hex chars

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const avgLuma = Math.round(sum / data.length);

  return dHash + avgLuma.toString(16).padStart(2, "0");
}

function hammingDistance(hexA: string, hexB: string): number {
  let x = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/** True if two computePerceptualHash outputs likely depict the same/near-identical image. */
export function areSimilar(hashA: string, hashB: string): boolean {
  const distance = hammingDistance(hashA.slice(0, 16), hashB.slice(0, 16));
  const lumaA = parseInt(hashA.slice(16, 18), 16);
  const lumaB = parseInt(hashB.slice(16, 18), 16);
  return distance <= DHASH_MAX_DISTANCE && Math.abs(lumaA - lumaB) <= AVG_LUMA_MAX_DIFF;
}
