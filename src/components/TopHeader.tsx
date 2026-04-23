"use client";

type Props = {
  total: number;
  visited: number;
  wishlist: number;
  notes: number;
};

export default function TopHeader({ total, visited, wishlist, notes }: Props) {
  return (
    <>
      {/* Brand — top-left corner. On mobile, collapses to just the "清"
          medallion to save vertical space; label returns at sm+. */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
        <div className="pointer-events-auto flex items-center gap-0 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)] sm:gap-2.5 sm:pr-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 font-serif text-[15px] leading-none text-white/85">
            清
          </span>
          <span className="hidden font-serif text-[13px] tracking-[0.18em] text-white/80 sm:inline">
            人生清单
          </span>
        </div>
      </div>

      {/* Narrative stats — top-right corner */}
      <StatsNarrative
        total={total}
        visited={visited}
        wishlist={wishlist}
        notes={notes}
      />

      {/* Inspired-by footer — bottom-left, very subtle */}
      <a
        href="https://www.youtube.com/@linksphotograph"
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto absolute bottom-3 left-3 z-20 hidden text-[10px] uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-white/60 sm:bottom-5 sm:left-5 sm:block"
      >
        inspired by @linksphotograph
      </a>
    </>
  );
}

function StatsNarrative({
  total,
  visited,
  wishlist,
  notes,
}: {
  total: number;
  visited: number;
  wishlist: number;
  notes: number;
}) {
  const percent = total > 0 ? (visited / total) * 100 : 0;
  const remaining = Math.max(0, total - visited);
  const percentLabel =
    percent >= 100 ? "100%" : percent > 0 ? `${percent.toFixed(1)}%` : "0%";

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[72vw] flex-col items-end text-right sm:right-5 sm:top-5 sm:max-w-[420px]">
      <div className="pointer-events-auto rounded-[22px] border border-white/12 bg-black/48 px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.26em] text-white/45">
              旅程进度
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div className="font-serif text-3xl leading-none tracking-[0.04em] text-white/95 tabular-nums sm:text-4xl">
                {visited}
              </div>
              <div className="pb-1 text-xs tracking-[0.18em] text-white/40">
                / {total}
              </div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">
            {percentLabel}
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full ${
              visited >= total ? "bg-amber-300" : "bg-gradient-to-r from-emerald-400 to-sky-300"
            }`}
            style={{ width: `${Math.max(6, percent)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2 text-[10px] sm:text-[11px]">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 tabular-nums text-emerald-200/90">
            已去 {visited}
          </span>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 tabular-nums text-amber-200/90">
            想去 {wishlist}
          </span>
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 tabular-nums text-sky-200/90">
            笔记 {notes}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 tabular-nums text-white/70">
            待探索 {remaining}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.2em] text-white/42">
          <span>按</span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/72">
            H
          </kbd>
          <span>隐藏 HUD</span>
        </div>
      </div>
    </div>
  );
}
