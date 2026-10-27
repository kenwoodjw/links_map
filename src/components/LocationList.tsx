"use client";
/* eslint-disable @next/next/no-img-element -- Video thumbnails retain a fixed-size error fallback. */

import { useMemo, useState } from "react";
import type { Location } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";

export default function LocationList({
  locations,
  selectedId,
  onSelect,
  onClose,
  onFilter,
  onReset,
}: {
  locations: Location[];
  selectedId: string | null;
  onSelect: (loc: Location) => void;
  onClose: () => void;
  onFilter: () => void;
  onReset: () => void;
}) {
  const statuses = useAllBucketStatuses();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const filtered = useMemo(
    () =>
      locations.filter((l) =>
        `${l.name} ${l.country}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [locations, query],
  );
  const groups = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const loc of filtered)
      map.set(loc.country, [...(map.get(loc.country) ?? []), loc]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);
  return (
    <>
      <header className="panel-header list-brand">
        <div>
          <span className="eyebrow">清 · 人生清单</span>
          <h1 tabIndex={-1} data-list-heading>
            地点
          </h1>
        </div>
        <button
          className="icon-button"
          aria-label="收起地点列表"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="list-search">
        <label className="sr-only" htmlFor="place-search">
          搜索列表中的地点或国家
        </label>
        <div className="search-field">
          <span aria-hidden>⌕</span>
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索地点或国家"
          />
          {query && (
            <button aria-label="清除搜索" onClick={() => setQuery("")}>
              ×
            </button>
          )}
        </div>
        <div className="list-count">
          <p aria-live="polite">
            列表结果 {filtered.length} / 当前筛选 {locations.length}
          </p>
          <button onClick={onFilter}>筛选</button>
        </div>
        <p className="muted text-xs">搜索仅筛选列表，地图保持当前范围</p>
      </div>
      <div className="list-scroll">
        {groups.map(([country, locs]) => {
          const folded = !query.trim() && collapsed.has(country);
          return (
            <div key={country}>
              <button
                className="country-heading"
                aria-expanded={!folded}
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(country)) next.delete(country);
                    else next.add(country);
                    return next;
                  })
                }
              >
                <span>
                  {folded ? "▸" : "▾"} {country}
                </span>
                <span>{locs.length}</span>
              </button>
              {!folded &&
                locs.map((loc) => (
                  <button
                    key={loc.id}
                    data-location-id={loc.id}
                    aria-current={selectedId === loc.id ? "true" : undefined}
                    className={`place-row ${selectedId === loc.id ? "selected" : ""}`}
                    onClick={() => onSelect(loc)}
                  >
                    <span className="place-thumb">
                      <span>{loc.name[0]}</span>
                      {loc.videos[0]?.thumbnail && (
                        <img
                          src={loc.videos[0].thumbnail}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </span>
                    <span className="place-copy">
                      <strong>{loc.name}</strong>
                      <small>
                        {loc.videos.length} 个视频 ·{" "}
                        {statuses[loc.id] === "visited"
                          ? "✓ 已去"
                          : statuses[loc.id] === "wishlist"
                            ? "♡ 想去"
                            : "待探索"}
                      </small>
                    </span>
                    <span className="muted" aria-hidden>
                      ↗
                    </span>
                  </button>
                ))}
            </div>
          );
        })}
        {!filtered.length && (
          <div className="empty-state">
            <span aria-hidden>⌕</span>
            <h2>
              {locations.length ? "没有找到匹配的地点" : "当前条件下暂无地点"}
            </h2>
            <p>
              {locations.length
                ? "试试国家名，或清除搜索"
                : "换一组条件继续探索"}
            </p>
            <button
              className="secondary-button"
              onClick={() => (locations.length ? setQuery("") : onReset())}
            >
              {locations.length ? "清除搜索" : "重置地区与状态"}
            </button>
          </div>
        )}
      </div>
      <footer className="list-footer">
        <a
          href="https://www.youtube.com/@linksphotograph"
          target="_blank"
          rel="noreferrer"
        >
          影像来自 @linksphotograph ↗
        </a>
        <span>让世界，成为你的清单。</span>
      </footer>
    </>
  );
}
