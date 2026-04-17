import type { Location, VideoRef } from "./types";

export type Frame = {
  /** stable key */
  key: string;
  /** url of the frame image */
  url: string;
  /** which video this frame belongs to */
  videoId: string;
  videoTitle: string;
  /** preview label: "封面" | "片段 1/2/3" */
  label: string;
};

/**
 * YouTube auto-generates 3 frame previews per video at ~25/50/75% and a cover.
 * These URLs are free, no API key required.
 *
 * Resolution tiers (in order of preference):
 *   maxresdefault.jpg / maxres{1,2,3}.jpg  → 1280×720, only for HD videos
 *   hqdefault.jpg     / hq{1,2,3}.jpg      → 480×360,  almost always available
 *   mqdefault.jpg     / mq{1,2,3}.jpg      → 320×180,  fallback
 *   1.jpg, 2.jpg, 3.jpg                    → 120×90,   too small, avoid
 *
 * We use `hq*.jpg` because it's the highest res reliably available for both
 * the cover and the mid-point frames. Missing frames return a 120×90 grey
 * placeholder — callers should probe `naturalWidth > 200` to detect those.
 */
export function framesForVideo(video: VideoRef): Frame[] {
  const id = video.id;
  return [
    {
      key: `${id}-cover`,
      url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "封面",
    },
    {
      key: `${id}-1`,
      url: `https://i.ytimg.com/vi/${id}/hq1.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "片段 1",
    },
    {
      key: `${id}-2`,
      url: `https://i.ytimg.com/vi/${id}/hq2.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "片段 2",
    },
    {
      key: `${id}-3`,
      url: `https://i.ytimg.com/vi/${id}/hq3.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "片段 3",
    },
  ];
}

export function framesForLocation(loc: Location): Frame[] {
  return loc.videos.flatMap(framesForVideo);
}
