"use client";

import { useMemo, useState } from "react";
import type { Location, BucketStatus } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";

type Tab = "all" | "visited" | "wishlist" | "unmarked";

type Props = {
  locations: Location[];
  onPick: (loc: Location) => void;
};

export default function FilterSidebar({ locations, onPick }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const statuses = useAllBucketStatuses();

  const counts = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    for (const l of locations) {
      const s = statuses[l.id];
      if (s === "visited") visited++;
      else if (s === "wishlist") wishlist++;
    }
    return { visited, wishlist, unmarked: locations.length - visited - wishlist };
  }, [locations, statuses]);

  const filtered = useMemo(() => {
    const byTab = locations.filter((l) => {
      const s = statuses[l.id] ?? null;
      if (tab === "visited") return s === "visited";
      if (tab === "wishlist") return s === "wishlist";
      if (tab === "unmarked") return s === null;
      return true;
    });
    const needle = q.trim().toLowerCase();
    if (!needle) return byTab;
    return byTab.filter(
      (l) => l.name.toLowerCase().includes(needle) || l.country.toLowerCase().includes(needle)
    );
  }, [locations, statuses, tab, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const l of filtered) {
      const list = map.get(l.country) ?? [];
      list.push(l);
      map.set(l.country, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "zh"));
  }, [filtered]);

  return (
    <aside className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl border-r border-slate-200">
      <header className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">
          人生清单 · 旅行地图
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          地点来自{" "}
          <a
            href="https://www.youtube.com/@linksphotograph"
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 hover:underline"
          >
            @linksphotograph
          </a>{" "}
          · 共 {locations.length} 处
        </p>
      </header>

      <div className="p-3 border-b border-slate-200">
        <div className="grid grid-cols-4 gap-1 text-xs">
          <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
            全部
            <span className="ml-1 text-slate-400">{locations.length}</span>
          </TabBtn>
          <TabBtn active={tab === "visited"} onClick={() => setTab("visited")} accent="emerald">
            已打卡
            <span className="ml-1 text-emerald-700">{counts.visited}</span>
          </TabBtn>
          <TabBtn active={tab === "wishlist"} onClick={() => setTab("wishlist")} accent="amber">
            想去
            <span className="ml-1 text-amber-700">{counts.wishlist}</span>
          </TabBtn>
          <TabBtn active={tab === "unmarked"} onClick={() => setTab("unmarked")}>
            未标
            <span className="ml-1 text-slate-400">{counts.unmarked}</span>
          </TabBtn>
        </div>
        <input
          type="search"
          placeholder="搜索地点或国家..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-400">没有匹配的地点</p>
        )}
        {grouped.map(([country, locs]) => (
          <div key={country}>
            <h3 className="sticky top-0 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              {country} <span className="text-slate-400">({locs.length})</span>
            </h3>
            <ul>
              {locs.map((l) => {
                const s: BucketStatus = statuses[l.id] ?? null;
                const dot =
                  s === "visited"
                    ? "bg-emerald-500"
                    : s === "wishlist"
                    ? "bg-amber-500"
                    : "bg-slate-300";
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => onPick(l)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                      <span className="flex-1 text-sm text-slate-800">{l.name}</span>
                      <span className="text-xs text-slate-400">
                        {l.videos.length} 视频
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function TabBtn({
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
  const base = "rounded-md px-2 py-1.5 font-medium transition-colors text-center";
  const idle = "bg-slate-100 text-slate-600 hover:bg-slate-200";
  const activeSky = "bg-sky-600 text-white";
  const activeEmerald = "bg-emerald-600 text-white";
  const activeAmber = "bg-amber-500 text-white";
  let cls = idle;
  if (active) {
    cls = accent === "emerald" ? activeEmerald : accent === "amber" ? activeAmber : activeSky;
  }
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}
