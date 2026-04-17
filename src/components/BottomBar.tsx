"use client";

import type { Region } from "@/lib/regions";
import { REGION_LABEL } from "@/lib/regions";

export type StatusFilter = "all" | "visited" | "wishlist";

type Props = {
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  region: Region | "all";
  onRegion: (r: Region | "all") => void;
  availableRegions: Region[];
};

const REGION_ORDER: Region[] = [
  "asia",
  "europe",
  "americas",
  "africa",
  "oceania",
  "polar",
];

export default function BottomBar({
  status,
  onStatus,
  region,
  onRegion,
  availableRegions,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 p-3 sm:gap-4 sm:p-6">
      {/* Group 1: Personal status */}
      <FilterGroup label="状态">
        <Chip active={status === "all"} onClick={() => onStatus("all")}>
          全部
        </Chip>
        <Chip
          active={status === "visited"}
          onClick={() => onStatus("visited")}
          accent="emerald"
        >
          ✓ 已打卡
        </Chip>
        <Chip
          active={status === "wishlist"}
          onClick={() => onStatus("wishlist")}
          accent="amber"
        >
          ♡ 想去
        </Chip>
      </FilterGroup>

      {/* Group 2: Region navigation */}
      <FilterGroup label="地区" scrollable>
        <Chip active={region === "all"} onClick={() => onRegion("all")}>
          Global
        </Chip>
        {REGION_ORDER.filter((r) => availableRegions.includes(r)).map((r) => (
          <Chip
            key={r}
            active={region === r}
            onClick={() => onRegion(r)}
          >
            {REGION_LABEL[r]}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  scrollable,
  children,
}: {
  label: string;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md ${
        scrollable ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""
      }`}
      aria-label={label}
      role="group"
    >
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: "emerald" | "amber";
}) {
  const base =
    "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all sm:px-3.5 sm:text-sm";
  const idle = "text-white/65 hover:text-white hover:bg-white/5";
  const activeDefault = "bg-white text-black shadow-md";
  const activeEmerald =
    "bg-emerald-500 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.9)]";
  const activeAmber =
    "bg-amber-500 text-white shadow-[0_0_20px_-5px_rgba(245,158,11,0.9)]";
  const cls = active
    ? accent === "emerald"
      ? activeEmerald
      : accent === "amber"
      ? activeAmber
      : activeDefault
    : idle;
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}
