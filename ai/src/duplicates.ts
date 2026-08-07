import { areSimilar } from "./perceptualHash";

export interface DuplicatePoint {
  id: string;
  contentHash: string | null;
  perceptualHash: string | null; // images only
}

/**
 * Clusters media into duplicate groups: exact matches (same contentHash,
 * both images and videos) or visually similar images (perceptualHash
 * Hamming distance <= threshold). Union-find over both criteria at once so
 * a chain of near-duplicates (A~B, B~C) ends up in one group even if A and
 * C aren't directly close enough on their own. Pure function — no I/O, no
 * persistence; be/src/routes/duplicates.ts owns computing hashes at upload
 * time and remembering dismissed groups.
 */
export function findDuplicateGroups<T extends DuplicatePoint>(media: T[]): T[][] {
  const parent = new Map<string, string>();
  for (const m of media) parent.set(m.id, m.id);

  function find(id: string): string {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let cur = id;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const byContentHash = new Map<string, string[]>();
  for (const m of media) {
    if (!m.contentHash) continue;
    const ids = byContentHash.get(m.contentHash) ?? [];
    ids.push(m.id);
    byContentHash.set(m.contentHash, ids);
  }
  for (const ids of byContentHash.values()) {
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  // O(n²) over images-with-hashes only — fine at personal-library scale,
  // same trade-off already accepted by groupByLocation in grouping.ts.
  const withPerceptualHash = media.filter((m) => m.perceptualHash);
  for (let i = 0; i < withPerceptualHash.length; i++) {
    for (let j = i + 1; j < withPerceptualHash.length; j++) {
      const a = withPerceptualHash[i];
      const b = withPerceptualHash[j];
      if (areSimilar(a.perceptualHash!, b.perceptualHash!)) {
        union(a.id, b.id);
      }
    }
  }

  const clusters = new Map<string, T[]>();
  for (const m of media) {
    const root = find(m.id);
    const list = clusters.get(root) ?? [];
    list.push(m);
    clusters.set(root, list);
  }

  return [...clusters.values()].filter((g) => g.length >= 2);
}
