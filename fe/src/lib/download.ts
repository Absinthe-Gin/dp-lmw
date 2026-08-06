import { api, API_URL } from "./api-client";

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single media item's original file. The backend signs the
 * storage URL with a forced Content-Disposition (be/src/routes/media.ts's
 * /:id/download), so a plain top-level navigation is enough to make the
 * browser save the file — no client-side fetch/CORS involved.
 */
export async function downloadMediaItem(id: string) {
  const { url } = await api.get<{ url: string }>(`/api/media/${id}/download`);
  window.location.assign(url);
}

/**
 * Direct link to an album's zip download — be/src/routes/albums.ts streams
 * the archive with an attachment header, so this can be a plain <a href>
 * (or window.location.assign) rather than going through fetch.
 */
export function albumDownloadUrl(id: string): string {
  return `${API_URL}/api/albums/${id}/download`;
}

/**
 * Bulk-selection download: unlike the two cases above, there's no single
 * resource id to build a GET url from, so this goes through a POST with a
 * JSON body and reads the response as a blob (be/src/routes/media.ts's
 * POST /download-zip).
 */
export async function downloadSelectionZip(ids: string[]) {
  const { blob, filename } = await api.downloadPost("/api/media/download-zip", { ids });
  triggerBlobDownload(blob, filename ?? "dp-lmw-media.zip");
}

/**
 * Bulk album download: there's no batch-zip endpoint for multiple albums (each
 * album's zip already streams directly via GET .../download), so this just
 * triggers that same per-album link for every selected album, staggered so
 * the browser doesn't treat near-simultaneous downloads as a popup flood.
 */
export async function downloadMultipleAlbums(ids: string[]) {
  ids.forEach((id, i) => {
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = albumDownloadUrl(id);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 400);
  });
}
