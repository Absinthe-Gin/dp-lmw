import type { MediaPoint } from "./types";

const SAME_EVENT_GAP_HOURS = 8; // gap larger than this starts a new group
const LOCATION_RADIUS_KM = 2;

/**
 * Groups media into date-based "event" clusters: a new cluster starts
 * whenever the gap between consecutive items (sorted by takenAt) exceeds
 * SAME_EVENT_GAP_HOURS. Pure function — caller owns persistence.
 */
export function groupByDate<T extends MediaPoint>(media: T[]): T[][] {
  const sorted = [...media]
    .filter((m) => m.takenAt)
    .sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime());

  const groups: T[][] = [];
  let current: T[] = [];

  for (const item of sorted) {
    const prev = current[current.length - 1];
    const gapHours = prev ? (item.takenAt!.getTime() - prev.takenAt!.getTime()) / 36e5 : 0;

    if (prev && gapHours > SAME_EVENT_GAP_HOURS) {
      groups.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length) groups.push(current);

  return groups.filter((g) => g.length >= 2); // ignore singletons
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Groups media by GPS proximity (naive O(n²) clustering — fine for
 * per-user batch sizes; revisit if a user's library grows very large).
 */
export function groupByLocation<T extends MediaPoint>(media: T[]): T[][] {
  const withGps = media.filter((m) => m.latitude != null && m.longitude != null);
  const groups: T[][] = [];

  for (const item of withGps) {
    const target = groups.find((g) =>
      g.some((m) => haversineKm(m.latitude!, m.longitude!, item.latitude!, item.longitude!) <= LOCATION_RADIUS_KM)
    );
    if (target) target.push(item);
    else groups.push([item]);
  }

  return groups.filter((g) => g.length >= 2);
}
