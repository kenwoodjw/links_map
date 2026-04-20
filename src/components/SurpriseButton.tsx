"use client";

import { useMemo } from "react";
import type { Location, BucketStatus } from "@/lib/types";

type Props = {
  locations: Location[];
  statuses: Record<string, BucketStatus>;
  onSelect: (loc: Location) => void;
  currentId?: string | null;
};

/**
 * Floating "Surprise me" button — amber sparkle in the bottom-right.
 * Picks randomly from the user's wishlist first; if empty, falls back to
 * locations they haven't visited; if those are exhausted, any location.
 * Excludes the currently-open location so the surprise always changes.
 */
export default function SurpriseButton({
  locations,
  statuses,
  onSelect,
  currentId,
}: Props) {
  const pool = useMemo(() => {
    const notCurrent = (l: Location) => l.id !== currentId;
    const wishlist = locations.filter(
      (l) => statuses[l.id] === "wishlist" && notCurrent(l)
    );
    if (wishlist.length) return wishlist;
    const unvisited = locations.filter(
      (l) => statuses[l.id] !== "visited" && notCurrent(l)
    );
    if (unvisited.length) return unvisited;
    return locations.filter(notCurrent);
  }, [locations, statuses, currentId]);

  const handleClick = () => {
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onSelect(pick);
  };

  const label = pool.length
    ? statuses[pool[0]?.id ?? ""] === "wishlist"
      ? "从想去清单随机"
      : "从未访问地随机"
    : "随机推荐";

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      className="group pointer-events-auto absolute bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/40 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-black/80 shadow-[0_10px_30px_-8px_rgba(251,191,36,0.7),0_0_40px_-12px_rgba(251,191,36,0.9)] transition-all duration-300 hover:scale-110 hover:shadow-[0_16px_42px_-8px_rgba(251,191,36,0.95),0_0_70px_-8px_rgba(251,191,36,1)] active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
    >
      {/* Breathing halo behind the button */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-full opacity-60 animate-[pulseGlow_2.6s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0) 70%)",
        }}
      />
      {/* Sparkle icon */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="relative h-6 w-6 drop-shadow-sm transition-transform duration-500 group-hover:rotate-[25deg] sm:h-7 sm:w-7"
      >
        <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9L12 2.5z" />
        <path
          d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15z"
          opacity="0.7"
        />
      </svg>
      {/* Tooltip — appears on hover, to the LEFT so it doesn't fall off-screen */}
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-xs tracking-wide text-white/90 opacity-0 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100">
        ✨ 今天去哪？
      </span>
    </button>
  );
}
