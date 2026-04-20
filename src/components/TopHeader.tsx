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
    percent >= 100 ? "100%" : percent > 0 ? `${percent.toFixed(1)}%` : "";

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[62vw] flex-col items-end text-right sm:right-5 sm:top-5 sm:max-w-[40vw]">
      <div className="pointer-events-auto">
        {visited === 0 ? (
          <div className="font-serif text-sm tracking-wide text-white/85 sm:text-base">
            <span className="tabular-nums text-white">{total}</span>
            <span className="text-white/60"> 处等你开启第一次</span>
            <span className="ml-1 text-amber-300/80">✨</span>
          </div>
        ) : visited >= total ? (
          <>
            <div className="font-serif text-2xl leading-none tracking-wide text-amber-200 tabular-nums sm:text-3xl">
              100%
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-amber-200/70 sm:text-[10px]">
              你已走遍地球上的每一处 ✨
            </div>
          </>
        ) : (
          <>
            <div className="font-serif text-xl leading-none tracking-wide text-white/95 tabular-nums sm:text-2xl">
              {percentLabel}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">
              <span className="text-emerald-300/80">已走过地球</span>
              <span className="mx-1.5 text-white/30">·</span>
              <span>还有 </span>
              <span className="tabular-nums text-white/85">{remaining}</span>
              <span> 处在等你</span>
            </div>
          </>
        )}
        {(wishlist > 0 || notes > 0) && (
          <div className="mt-2 flex items-center justify-end gap-2 text-[10px] sm:text-[11px]">
            {wishlist > 0 && (
              <span className="tabular-nums text-amber-300/75">♡ {wishlist} 想去</span>
            )}
            {wishlist > 0 && notes > 0 && (
              <span className="h-2.5 w-px bg-white/15" />
            )}
            {notes > 0 && (
              <span className="tabular-nums text-sky-300/75">✎ {notes} 笔记</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
