"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location } from "@/lib/types";
import { useBucketStatus } from "@/lib/bucketList";
import { framesForLocation, type Frame } from "@/lib/videoFrames";
import { formatSavedAgo, useNote, type Note } from "@/lib/notes";

type FrameStatus = "loading" | "valid" | "invalid";

/**
 * Pre-load each candidate frame URL and track its status.
 *   - Covers (hqdefault.jpg) are optimistically marked valid — they exist for any real video
 *   - hq1/2/3.jpg are probed: > 200px wide → valid, otherwise invalid
 * Returns a status map so the UI can show loading skeletons for in-flight frames.
 */
function useFrameStatuses(
  allFrames: Frame[]
): Record<string, FrameStatus> {
  const [statuses, setStatuses] = useState<Record<string, FrameStatus>>(
    () => ({})
  );

  useEffect(() => {
    // Seed: covers are valid, everything else is loading
    const initial: Record<string, FrameStatus> = {};
    for (const f of allFrames) {
      initial[f.key] = f.key.endsWith("-cover") ? "valid" : "loading";
    }
    setStatuses(initial);

    let cancelled = false;
    for (const f of allFrames) {
      if (f.key.endsWith("-cover")) continue;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setStatuses((prev) => ({
          ...prev,
          [f.key]: img.naturalWidth > 200 ? "valid" : "invalid",
        }));
      };
      img.onerror = () => {
        if (cancelled) return;
        setStatuses((prev) => ({ ...prev, [f.key]: "invalid" }));
      };
      img.src = f.url;
    }

    return () => {
      cancelled = true;
    };
  }, [allFrames]);

  return statuses;
}

type Props = {
  location: Location | null;
  onClose: () => void;
};

export default function LocationLightbox({ location, onClose }: Props) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [status, setStatus] = useBucketStatus(location?.id ?? "");

  const allFrames = useMemo(
    () => (location ? framesForLocation(location) : []),
    [location]
  );
  const frameStatuses = useFrameStatuses(allFrames);
  // Deduplicate by videoId — keeps only the first valid candidate per video
  // (maxresdefault wins over hqdefault when both are valid, since it comes first).
  const frames = useMemo(() => {
    const seen = new Set<string>();
    return allFrames.filter((f) => {
      if (frameStatuses[f.key] !== "valid") return false;
      if (seen.has(f.videoId)) return false;
      seen.add(f.videoId);
      return true;
    });
  }, [allFrames, frameStatuses]);
  const pendingCount = useMemo(
    () =>
      allFrames.filter((f) => frameStatuses[f.key] === "loading").length,
    [allFrames, frameStatuses]
  );
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset to first frame whenever the location changes
  useEffect(() => {
    setFrameIdx(0);
  }, [location?.id]);

  // Clamp index if the valid-frames list grows/shrinks after probing
  useEffect(() => {
    if (frames.length > 0 && frameIdx >= frames.length) {
      setFrameIdx(0);
    }
  }, [frames.length, frameIdx]);

  // Reset the main-image skeleton whenever the active frame changes
  useEffect(() => {
    setImgLoaded(false);
  }, [frames[frameIdx]?.key]);

  useEffect(() => {
    if (!location) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setFrameIdx((i) => (i + 1) % frames.length);
      if (e.key === "ArrowLeft")
        setFrameIdx((i) => (i - 1 + frames.length) % frames.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [location, onClose, frames.length]);

  if (!location || frames.length === 0) return null;

  const frame = frames[frameIdx];
  const youtubeUrl = `https://www.youtube.com/watch?v=${frame.videoId}`;

  const prev = () =>
    setFrameIdx((i) => (i - 1 + frames.length) % frames.length);
  const next = () => setFrameIdx((i) => (i + 1) % frames.length);

  return (
    <>
      {/* Right-side panel — slides in from the right edge */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex items-center p-3 sm:p-5 pointer-events-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Card */}
        <div
          className="pointer-events-auto relative flex w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-[slideInRight_0.38s_cubic-bezier(0.22,1,0.36,1)]"
          style={{ maxHeight: "calc(100vh - 2.5rem)" }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-1.5 text-white/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
          </svg>
        </button>

        {/* Gallery area — shrink-0 so the body below can flex-scroll */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
          {/* Blurred placeholder — hqdefault is already cached from the marker
              thumbnail, so it appears instantly and eliminates the black flash. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${frame.videoId}/hqdefault.jpg`}
            aria-hidden
            alt=""
            className={`absolute inset-0 h-full w-full scale-110 object-cover blur-lg transition-opacity duration-500 ${
              imgLoaded ? "opacity-0" : "opacity-100"
            }`}
          />
          {/* Main image — fades in sharp once loaded */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={frame.key}
            src={frame.url}
            alt={frame.videoTitle}
            onLoad={() => setImgLoaded(true)}
            className={`relative h-full w-full object-cover transition-opacity duration-500 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Frame label */}
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/80 backdrop-blur-sm">
            {frame.label}
          </span>

          {/* Counter */}
          <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {frameIdx + 1} / {frames.length}
          </span>

          {/* Prev / Next arrows */}
          {frames.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="上一张"
                className="group absolute left-0 top-0 flex h-full w-12 items-center justify-start pl-2 text-white/60 transition-colors hover:bg-gradient-to-r hover:from-black/50 hover:to-transparent hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-6 w-6 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-transform group-hover:-translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.7 5.3a1 1 0 010 1.4L9.4 10l3.3 3.3a1 1 0 01-1.4 1.4l-4-4a1 1 0 010-1.4l4-4a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={next}
                aria-label="下一张"
                className="group absolute right-0 top-0 flex h-full w-12 items-center justify-end pr-2 text-white/60 transition-colors hover:bg-gradient-to-l hover:from-black/50 hover:to-transparent hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-6 w-6 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.3 14.7a1 1 0 010-1.4L10.6 10 7.3 6.7a1 1 0 011.4-1.4l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Dots indicator */}
          {frames.length > 1 && frames.length <= 12 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {frames.map((f, i) => (
                <button
                  key={f.key}
                  onClick={() => setFrameIdx(i)}
                  aria-label={`跳到第 ${i + 1} 张`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === frameIdx
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body — scrollable when content overflows in the side panel */}
        <div className="scroll-hidden flex-1 overflow-y-auto px-5 pt-4 pb-5">
          <h2 className="font-serif text-2xl tracking-wide">{location.name}</h2>
          <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-white/50">
            {location.country}
          </p>

          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/75">
            {frame.videoTitle}
          </p>

          {/* YouTube link row */}
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 shrink-0 text-red-500"
            >
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
            </svg>
            <span className="truncate font-mono">{youtubeUrl}</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="ml-auto h-3.5 w-3.5 shrink-0 text-white/40"
            >
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>

          {/* Status buttons */}
          <div className="mt-4 flex items-center gap-2">
            <StatusButton
              label="✓ 已打卡"
              active={status === "visited"}
              activeClass="bg-emerald-500 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.8)]"
              onClick={() =>
                setStatus(status === "visited" ? null : "visited")
              }
            />
            <StatusButton
              label="♡ 想去"
              active={status === "wishlist"}
              activeClass="bg-amber-500 text-white shadow-[0_0_20px_-5px_rgba(245,158,11,0.8)]"
              onClick={() =>
                setStatus(status === "wishlist" ? null : "wishlist")
              }
            />
            <span className="ml-auto text-[10px] uppercase tracking-widest text-white/40">
              {location.videos.length} 个视频
            </span>
          </div>

          {/* Personal notes */}
          <NoteEditor locationId={location.id} visited={status === "visited"} />

          {/* Thumbnail strip */}
          {(frames.length > 1 || pendingCount > 0) && (
            <div className="mt-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {frames.map((f, i) => (
                <button
                  key={f.key}
                  onClick={() => setFrameIdx(i)}
                  className={`relative shrink-0 overflow-hidden rounded-md transition-all ${
                    i === frameIdx
                      ? "ring-2 ring-white"
                      : "opacity-50 ring-1 ring-white/10 hover:opacity-100"
                  }`}
                  style={{ width: 80, height: 45 }}
                  aria-label={`${f.label}: ${f.videoTitle}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.label}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
              {/* Skeleton placeholders for frames still probing */}
              {Array.from({ length: pendingCount }).map((_, i) => (
                <span
                  key={`skeleton-${i}`}
                  aria-hidden
                  className="shrink-0 animate-[shimmer_1.8s_ease-in-out_infinite] rounded-md ring-1 ring-white/10"
                  style={{
                    width: 80,
                    height: 45,
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)",
                    backgroundSize: "200% 100%",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

function StatusButton({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? activeClass
          : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function NoteEditor({
  locationId,
  visited,
}: {
  locationId: string;
  visited: boolean;
}) {
  const [note, setNoteState] = useNote(locationId);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [visitedAt, setVisitedAt] = useState<string>("");
  const [savedFlash, setSavedFlash] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate local state from persisted note when the location changes
  useEffect(() => {
    setText(note?.text ?? "");
    setVisitedAt(note?.visitedAt ?? "");
    // Auto-expand if a note already exists or user has marked visited
    setExpanded(Boolean(note) || visited);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const commit = (nextText: string, nextDate: string) => {
    const trimmed = nextText.trim();
    if (!trimmed && !nextDate) {
      setNoteState(null);
    } else {
      const updated: Note = {
        text: trimmed,
        visitedAt: nextDate || null,
        updatedAt: Date.now(),
      };
      setNoteState(updated);
    }
    setSavedFlash(Date.now());
  };

  const hasContent = text.trim().length > 0 || Boolean(visitedAt);
  const savedLabel = note ? formatSavedAgo(note.updatedAt) : null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next) setTimeout(() => textareaRef.current?.focus(), 50);
        }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white/60 transition-colors hover:text-white/90"
      >
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5 text-white/50"
          >
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v4a1 1 0 001 1h4v6H4V5z" />
          </svg>
          我的笔记
          {note && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/70">
              已写
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-white/40">
          {savedLabel && !expanded && <span>上次 · {savedLabel}</span>}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3 w-3 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-white/5 px-3 py-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => commit(text, visitedAt)}
            placeholder={
              visited
                ? "写下这次旅行的感想…天气、心情、推荐的小店"
                : "为什么想去？想做什么？"
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed text-white/90 placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
              到访日期
            </label>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => {
                setVisitedAt(e.target.value);
                commit(text, e.target.value);
              }}
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/80 focus:border-white/30 focus:outline-none"
            />
            {hasContent && (
              <button
                onClick={() => {
                  setText("");
                  setVisitedAt("");
                  setNoteState(null);
                  setSavedFlash(Date.now());
                }}
                className="ml-auto text-[10px] uppercase tracking-widest text-white/40 transition-colors hover:text-red-400"
              >
                清空
              </button>
            )}
          </div>

          {savedLabel && (
            <p className="text-right text-[10px] text-white/40">
              {savedFlash && Date.now() - savedFlash < 2500
                ? "✓ 已保存"
                : `已保存 · ${savedLabel}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
