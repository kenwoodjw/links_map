"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";

type Props = {
  locations: Location[];
  selectedId: string | null;
  onSelect: (loc: Location) => void;
};

export default function LocationList({ locations, selectedId, onSelect }: Props) {
  const statuses = useAllBucketStatuses();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(needle) ||
        loc.country.toLowerCase().includes(needle)
    );
  }, [locations, query]);

  // Group by country, sorted by location count desc
  const groups = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const loc of filtered) {
      const arr = map.get(loc.country) ?? [];
      arr.push(loc);
      map.set(loc.country, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const initialCollapsed = useMemo(
    () => new Set(groups.slice(2).map(([country]) => country)),
    [groups]
  );
  const [collapsed, setCollapsed] = useState<Set<string> | null>(null);
  const selectedCountry = locations.find((l) => l.id === selectedId)?.country ?? null;

  const counts = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    for (const loc of filtered) {
      const status = statuses[loc.id] ?? null;
      if (status === "visited") visited++;
      else if (status === "wishlist") wishlist++;
    }
    return { visited, wishlist };
  }, [filtered, statuses]);

  const toggle = (country: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev ?? initialCollapsed);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });

  // Expand the country of the selected item and scroll it into view
  useEffect(() => {
    if (!selectedId) return;
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const isOpen = open || selectedId !== null;
  const collapsedCountries = collapsed ?? initialCollapsed;

  if (!isOpen) {
    return (
      <div className="fixed left-3 top-1/2 z-30 -translate-y-1/2 sm:left-5">
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/58 px-3 py-2 text-xs text-white/80 shadow-[0_14px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-colors hover:bg-black/70 hover:text-white"
        >
          <span className="text-base leading-none">☰</span>
          <span className="hidden sm:inline">地点</span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 tabular-nums text-[10px] text-white/55">
            {filtered.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 left-0 z-30 flex items-stretch p-3 sm:p-5 pointer-events-none">
      <div
        className="pointer-events-auto relative flex w-[280px] flex-col overflow-hidden
                   rounded-[28px] border border-white/10 bg-black/58 text-white
                   shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl
                   animate-[slideInLeft_0.38s_cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: "calc(100vh - 2.5rem)" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                地点导航
              </div>
              <div className="mt-1 font-serif text-lg tracking-[0.04em] text-white/92">
                {query.trim() ? "筛选结果" : "按国家浏览"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="收起地点列表"
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              收起
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
            <SummaryPill label="可见" value={filtered.length} tone="neutral" />
            <SummaryPill label="已去" value={counts.visited} tone="visited" />
            <SummaryPill label="想去" value={counts.wishlist} tone="wishlist" />
          </div>

          <div className="mt-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索地点 / 国家"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/90 placeholder:text-white/30 focus:border-white/22 focus:outline-none"
            />
          </div>
        </div>

        {/* Grouped list */}
        <div ref={listRef} className="scroll-hidden flex-1 overflow-y-auto py-1">
          {groups.map(([country, locs]) => {
            const isCollapsed =
              query.trim() || selectedCountry === country
                ? false
                : collapsedCountries.has(country);
            return (
              <div key={country}>
                {/* Country header row */}
                <button
                  onClick={() => toggle(country)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.05]"
                >
                  <svg
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    className={`h-2 w-2 shrink-0 text-white/25 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                  >
                    <path d="M5 7 L1 3 L9 3 Z" />
                  </svg>
                  <span className="flex-1 truncate text-[10px] uppercase tracking-[0.18em] text-white/48">
                    {country}
                  </span>
                  <span className="tabular-nums text-[10px] text-white/25">{locs.length}</span>
                </button>

                {/* Location items */}
                {!isCollapsed &&
                  locs.map((loc) => {
                    const status = statuses[loc.id] ?? null;
                    const isSelected = loc.id === selectedId;
                    const first = loc.videos[0];

                    return (
                      <button
                        key={loc.id}
                        data-id={loc.id}
                        onClick={() => onSelect(loc)}
                        className={`group flex w-full items-center gap-3 py-2 pr-3 pl-6 text-left transition-colors duration-150 ${
                          isSelected
                            ? "bg-white/[0.10] shadow-[inset_2px_0_0_rgba(255,255,255,0.85)]"
                            : "hover:bg-white/[0.06]"
                        }`}
                      >
                        {/* Thumbnail + status dot */}
                        <span className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={first?.thumbnail}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                            loading="lazy"
                          />
                          {status && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-[1.5px] ring-black/80"
                              style={{ background: status === "visited" ? "#10b981" : "#f59e0b" }}
                            />
                          )}
                        </span>

                        {/* Name + video count */}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-serif text-[13px] leading-snug text-white/88">
                            {loc.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[9.5px] tabular-nums text-white/30">
                            <span>{loc.videos.length} 个视频</span>
                            <span className="h-1 w-1 rounded-full bg-white/18" />
                            <span>{status === "visited" ? "已去" : status === "wishlist" ? "想去" : "未标记"}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}

          {locations.length === 0 && (
            <div className="py-10 text-center text-xs text-white/30">无匹配地点</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "visited" | "wishlist";
}) {
  const toneClass =
    tone === "visited"
      ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-100/85"
      : tone === "wishlist"
      ? "border-amber-300/15 bg-amber-300/10 text-amber-100/85"
      : "border-white/10 bg-white/[0.04] text-white/72";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-sm tabular-nums">{value}</div>
    </div>
  );
}
