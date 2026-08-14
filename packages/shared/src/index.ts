export type MediaType = "IMAGE" | "VIDEO";
export type AlbumSource = "MANUAL" | "AUTO_DATE" | "AUTO_LOCATION";

// No ownerId: this is a shared public vault, not per-account storage.
export interface MediaDTO {
  id: string;
  type: MediaType;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  takenAt: string | null; // ISO string over the wire
  latitude: number | null;
  longitude: number | null;
  uploadedAt: string;
}

export interface AlbumDTO {
  id: string;
  title: string;
  description: string | null;
  source: AlbumSource;
  createdAt: string;
  mediaCount: number;
}

export interface AlbumDetailDTO extends AlbumDTO {
  media: MediaDTO[];
}

// Curated home-page hero slideshow content — deliberately separate from
// MediaDTO (images only, admin-curated, no takenAt/gps/duration).
export interface HomeSlideDTO {
  id: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}
