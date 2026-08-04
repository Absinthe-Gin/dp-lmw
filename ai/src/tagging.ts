/**
 * Placeholder for future smart-tagging / captioning (e.g. calling Claude's
 * vision API to describe a photo or suggest an album title). Not wired
 * into `be` yet — add an ANTHROPIC_API_KEY-backed implementation here
 * when that feature is prioritized, keeping the LLM call isolated from
 * the grouping logic in grouping.ts.
 */
export async function suggestAlbumTitle(_sampleImageBuffer: Buffer): Promise<string | null> {
  return null;
}
