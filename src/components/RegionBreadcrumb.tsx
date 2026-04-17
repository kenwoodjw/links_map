"use client";

import type { Region } from "@/lib/regions";
import { REGION_LABEL } from "@/lib/regions";

type Props = {
  region: Region | "all";
  onClear: () => void;
};

export default function RegionBreadcrumb({ region, onClear }: Props) {
  if (region === "all") return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-14 z-30 flex -translate-x-1/2 justify-center sm:top-16">
      <button
        onClick={onClear}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3.5 py-1.5 text-xs text-white/75 shadow-[0_6px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:border-white/25 hover:bg-black/70 hover:text-white animate-[slideDown_0.35s_cubic-bezier(0.34,1.4,0.6,1)]"
        aria-label="返回全球视图"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 text-white/60"
        >
          <path
            fillRule="evenodd"
            d="M9.7 4.3a1 1 0 010 1.4L6.4 9H17a1 1 0 110 2H6.4l3.3 3.3a1 1 0 11-1.4 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-white/55">正在查看</span>
        <span className="font-medium tracking-wide text-white">
          {REGION_LABEL[region]}
        </span>
        <span className="text-white/30">·</span>
        <span className="text-white/60 transition-colors group-hover:text-white">
          返回全球
        </span>
      </button>
    </div>
  );
}
