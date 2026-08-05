/**
 * "Recently viewed" is tracked client-side only (localStorage) — this app
 * has no accounts, so there's no server-side concept of "who viewed what."
 * Recorded on: opening a MediaLightbox (media.id) and loading an album
 * detail page (album.id). Read back on the home page.
 */
type RecentKind = "media" | "album";
type RecentEntry = { kind: RecentKind; id: string; viewedAt: number };

const KEY = "mv_recently_viewed";
const MAX_ENTRIES = 30;

function readAll(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordView(kind: RecentKind, id: string) {
  if (typeof window === "undefined") return;
  const rest = readAll().filter((e) => !(e.kind === kind && e.id === id));
  const next = [{ kind, id, viewedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(next));
}

/** Ids of the given kind, most-recently-viewed first. */
export function getRecentIds(kind: RecentKind): string[] {
  return readAll()
    .filter((e) => e.kind === kind)
    .map((e) => e.id);
}
