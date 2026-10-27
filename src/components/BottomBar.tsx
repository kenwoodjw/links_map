"use client";
import { REGION_LABEL, type Region } from "@/lib/regions";
export type StatusFilter = "all" | "visited" | "wishlist";
export type FilterProps = {
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  region: Region | "all";
  onRegion: (r: Region | "all") => void;
  availableRegions: Region[];
};
export function Filters({
  status,
  onStatus,
  region,
  onRegion,
  availableRegions,
}: FilterProps) {
  return (
    <div className="filters">
      <fieldset>
        <legend>我的清单</legend>
        <div className="filter-options">
          {(
            [
              ["all", "全部"],
              ["wishlist", "♡ 想去"],
              ["visited", "✓ 已去"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => onStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>探索地区</legend>
        <div className="filter-options">
          <button
            aria-pressed={region === "all"}
            onClick={() => onRegion("all")}
          >
            全球
          </button>
          {availableRegions.map((r) => (
            <button
              key={r}
              aria-pressed={region === r}
              onClick={() => onRegion(r)}
            >
              {REGION_LABEL[r]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
export default function BottomBar({
  onList,
  onFilter,
  onSurprise,
  count,
  canSurprise,
  listOpen,
  detailOpen,
}: {
  onList: () => void;
  onFilter: () => void;
  onSurprise: () => void;
  count: number;
  canSurprise: boolean;
  listOpen: boolean;
  detailOpen: boolean;
}) {
  return (
    <nav
      aria-label="探索工具"
      className={`explore-dock ${listOpen ? "with-list" : ""} ${detailOpen ? "with-detail" : ""}`}
    >
      <button
        data-list-trigger
        className="surface mobile-list-button"
        onClick={onList}
      >
        ☰ 地点 {count}
      </button>
      <button className="surface" onClick={onFilter}>
        ☷ 筛选
      </button>
      <button
        className="primary-button surprise-button"
        onClick={onSurprise}
        disabled={!canSurprise}
        title={!canSurprise ? "当前没有其他可探索地点" : undefined}
      >
        <span aria-hidden>✦</span> 随机探索
      </button>
      {!canSurprise && (
        <span className="random-empty">当前没有其他可探索地点</span>
      )}
    </nav>
  );
}
