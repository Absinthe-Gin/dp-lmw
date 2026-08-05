/**
 * Builds a Content-Disposition value that survives non-ASCII filenames.
 * Album titles are often Vietnamese (auto-generated ones are literally a
 * localized date, e.g. "5 tháng 8, 2026") and become the zip filename for
 * an album download — a plain `filename="..."` with raw UTF-8 bytes isn't
 * RFC-compliant and some browsers mangle or reject it. Sending both the
 * ASCII-safe fallback and the RFC 5987 `filename*=UTF-8''...` form covers
 * every browser: compliant ones prefer the encoded form, others fall back
 * to the ASCII name instead of a broken one.
 */
export function attachmentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
