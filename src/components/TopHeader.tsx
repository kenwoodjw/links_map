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
      {/* Brand — top-left corner */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 py-1 pl-1 pr-3.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 font-serif text-[15px] leading-none text-white/85">
            清
          </span>
          <span className="font-serif text-[13px] tracking-[0.18em] text-white/80">
            人生清单
          </span>
        </div>
      </div>

      {/* Stats — top-right corner */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)] sm:gap-3 sm:text-xs">
          <span className="tabular-nums">{total} 处</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="tabular-nums text-emerald-400">✓ {visited}</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="tabular-nums text-amber-400">♡ {wishlist}</span>
          {notes > 0 && (
            <>
              <span className="h-3 w-px bg-white/15" />
              <span className="tabular-nums text-sky-400">✎ {notes}</span>
            </>
          )}
        </div>
      </div>

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
