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
  onSurprise: () => void;
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
  onSurprise,
}: Props) {
  const statusGroup = (
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
  );

  const regionGroup = (
    <FilterGroup label="地区" scrollable compact>
      <Chip active={region === "all"} onClick={() => onRegion("all")}>
        Global
      </Chip>
      {REGION_ORDER.filter((r) => availableRegions.includes(r)).map((r) => (
        <Chip key={r} active={region === r} onClick={() => onRegion(r)}>
          {REGION_LABEL[r]}
        </Chip>
      ))}
    </FilterGroup>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3 sm:bottom-5 sm:px-5">
      <div className="pointer-events-auto flex max-w-[min(1100px,100%)] flex-wrap items-center justify-center gap-2 rounded-[28px] border border-white/10 bg-black/52 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:flex-nowrap sm:gap-3 sm:px-3">
        <DockSection label="状态">{statusGroup}</DockSection>
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <DockSection label="地区" grow>
          {regionGroup}
        </DockSection>
        <button
          onClick={onSurprise}
          className="group inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3.5 py-2 text-xs font-medium text-amber-100 transition-all hover:border-amber-200/40 hover:bg-amber-300/18 hover:text-white"
        >
          <span className="text-sm transition-transform duration-300 group-hover:rotate-[18deg]">
            ✦
          </span>
          <span className="whitespace-nowrap">随机探索</span>
        </button>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  scrollable,
  compact,
  children,
}: {
  label: string;
  scrollable?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/10 ${
        compact ? "bg-white/[0.03]" : "bg-black/45"
      } p-1 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-md ${
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

function DockSection({
  label,
  grow,
  children,
}: {
  label: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${grow ? "min-w-0 sm:flex-1" : ""}`}
    >
      <span className="hidden text-[10px] uppercase tracking-[0.22em] text-white/38 sm:inline">
        {label}
      </span>
      {children}
    </div>
  );
}
