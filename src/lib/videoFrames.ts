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
 * For each video we emit two candidates:
 *   1. maxresdefault.jpg (1280×720) — only exists for HD videos, probed at runtime
 *   2. hqdefault.jpg     (480×360)  — always available, auto-marked valid (key ends "-cover")
 *
 * LocationLightbox deduplicates by videoId so only the first valid candidate
 * per video is shown. This gives maxres when it exists, hq as a silent fallback —
 * and never the random mid-point frames (hq1/2/3) that YouTube auto-generates.
 */
export function framesForVideo(video: VideoRef): Frame[] {
  const id = video.id;
  return [
    // Probe for high-res creator thumbnail first
    {
      key: `${id}-maxres`,
      url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "封面",
    },
    // Guaranteed fallback — key ends with "-cover" so the Lightbox skips the probe
    {
      key: `${id}-cover`,
      url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      videoId: id,
      videoTitle: video.title,
      label: "封面",
    },
  ];
}

export function framesForLocation(loc: Location): Frame[] {
  return loc.videos.flatMap((video, idx) =>
    framesForVideo(video).map((f) => ({
      ...f,
      // Multi-video locations: label by video number so thumbnails are distinguishable
      label: loc.videos.length > 1 ? `视频 ${idx + 1}` : "封面",
    }))
  );
}
