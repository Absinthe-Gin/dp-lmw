/**
 * Plain data shapes used by the AI package. Deliberately independent of
 * Prisma's generated types so this package has no database dependency —
 * `be` maps its own Media rows into this shape before calling in here.
 */
export interface MediaPoint {
  id: string;
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ExifResult {
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
}
