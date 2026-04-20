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

  // Group by country, sorted by location count desc
  const groups = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const loc of locations) {
      const arr = map.get(loc.country) ?? [];
      arr.push(loc);
      map.set(loc.country, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [locations]);

  // All countries expanded by default
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (country: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(country) ? next.delete(country) : next.add(country);
      return next;
    });

  // Expand the country of the selected item and scroll it into view
  useEffect(() => {
    if (!selectedId) return;
    const loc = locations.find((l) => l.id === selectedId);
    if (loc) setCollapsed((prev) => { const next = new Set(prev); next.delete(loc.country); return next; });
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId, locations]);

  return (
    <div className="fixed inset-y-0 left-0 z-30 flex items-stretch p-3 sm:p-5 pointer-events-none">
      <div
        className="pointer-events-auto relative flex w-[236px] flex-col overflow-hidden
                   rounded-2xl border border-white/10 bg-black/75 text-white
                   shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl
                   animate-[slideInLeft_0.38s_cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: "calc(100vh - 2.5rem)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">地点列表</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] tabular-nums text-white/35">
            {locations.length}
          </span>
        </div>

        {/* Grouped list */}
        <div ref={listRef} className="scroll-hidden flex-1 overflow-y-auto py-1">
          {groups.map(([country, locs]) => {
            const isCollapsed = collapsed.has(country);
            return (
              <div key={country}>
                {/* Country header row */}
                <button
                  onClick={() => toggle(country)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.05]"
                >
                  <svg
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    className={`h-2 w-2 shrink-0 text-white/25 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                  >
                    <path d="M5 7 L1 3 L9 3 Z" />
                  </svg>
                  <span className="flex-1 truncate text-[10px] uppercase tracking-[0.18em] text-white/45">
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
                        className={`group flex w-full items-center gap-2.5 py-1.5 pr-3 pl-7 text-left transition-colors duration-150 ${
                          isSelected ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
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
                          <span className="truncate font-serif text-[12.5px] leading-snug text-white/88">
                            {loc.name}
                          </span>
                          <span className="mt-0.5 text-[9.5px] tabular-nums text-white/30">
                            {loc.videos.length} 个视频
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
