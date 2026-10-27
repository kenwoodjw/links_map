"use client";

import type { Ref } from "react";

export type StatsProps = {
  total: number;
  visited: number;
  wishlist: number;
  notes: number;
};
export function StatsContent({ total, visited, wishlist, notes }: StatsProps) {
  const percent = Math.min(
    100,
    Math.max(0, total ? (visited / total) * 100 : 0),
  );
  return (
    <div className="stats-content">
      <p className="eyebrow">全部地点 · 旅程进度</p>
      <div className="progress-number">
        <strong>{visited}</strong>
        <span>/ {total} 个地点</span>
        <b>{percent ? percent.toFixed(1) : "0"}%</b>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="已去进度"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <div className="stats-grid">
        <span>
          ♡ 想去 <b>{wishlist}</b>
        </span>
        <span>
          手记 <b>{notes}</b>
        </span>
        <span>
          待探索 <b>{Math.max(0, total - visited)}</b>
        </span>
      </div>
      <p className="muted text-xs">旅程从一个想去的地方开始。</p>
    </div>
  );
}
export default function TopHeader({
  visited,
  wishlist,
  onOpen,
  buttonRef,
}: StatsProps & { onOpen: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={buttonRef}
      className="surface stats-summary"
      onClick={onOpen}
      aria-label={`查看统计，已去 ${visited}，想去 ${wishlist}`}
    >
      <span className="visited-dot" />
      已去 {visited}
      <span className="stat-divider" />♡ 想去 {wishlist}
      <span className="muted">⌄</span>
    </button>
  );
}
