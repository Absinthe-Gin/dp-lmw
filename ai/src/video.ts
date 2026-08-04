/**
 * Placeholder for turning an album into a video/slideshow (ffmpeg-based
 * concat + transitions + optional background music). Not implemented yet —
 * wire this up behind be/src/routes/albums.ts's POST /:id/video once
 * prioritized, keeping the encoding pipeline isolated from grouping.ts
 * the same way tagging.ts isolates the future LLM captioning call.
 */
export async function generateAlbumSlideshow(_mediaStorageKeys: string[]): Promise<{ storageKey: string } | null> {
  return null;
}
