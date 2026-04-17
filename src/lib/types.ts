export type BucketStatus = "visited" | "wishlist" | null;

export type VideoRef = {
  id: string;
  title: string;
  thumbnail: string;
  viewCount?: number;
  durationSec?: number;
};

export type Location = {
  /** stable slug id, e.g. "reykjavik-iceland" */
  id: string;
  /** display name, preferably in Chinese where applicable */
  name: string;
  /** country display name */
  country: string;
  lat: number;
  lng: number;
  videos: VideoRef[];
  /** extractor confidence: high | medium | low */
  confidence: "high" | "medium" | "low";
};
