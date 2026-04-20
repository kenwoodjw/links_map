"use client";

import { useEffect, useState } from "react";

type Rect = { left: number; top: number; width: number; height: number };

type Props = {
  sourceRect: Rect;
  targetRect: Rect;
  thumbnail: string;
  /** Fired when the clone reaches the hero slot — parent should reveal the card. */
  onSettled: () => void;
  /** Fired after the clone has faded out — parent can unmount the overlay. */
  onDone: () => void;
};

/**
 * FLIP-open animation — renders a clone of the clicked marker thumbnail that
 * physically travels from the marker's viewport position into the Lightbox's
 * hero slot, morphing from a 36px circle into the card's 16:9 hero rectangle.
 *
 * Phases:
 *   "from"   — painted at sourceRect with circle border radius
 *   "to"     — transitioning to targetRect with rounded-2xl radius (~720ms)
 *   "settle" — clone fades out as the Lightbox chrome fades in (~320ms)
 *
 * The two-rAF handshake is load-bearing: without it React batches the phase
 * mutation into the same paint and the browser skips the transition.
 */
export default function LightboxFlipOverlay({
  sourceRect,
  targetRect,
  thumbnail,
  onSettled,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<"from" | "to" | "settle">("from");

  useEffect(() => {
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPhase("to"));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  useEffect(() => {
    if (phase !== "to") return;
    const t = setTimeout(() => {
      setPhase("settle");
      onSettled();
    }, 720);
    return () => clearTimeout(t);
  }, [phase, onSettled]);

  useEffect(() => {
    if (phase !== "settle") return;
    const t = setTimeout(() => onDone(), 320);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const rect = phase === "from" ? sourceRect : targetRect;
  const radius = phase === "from" ? "9999px" : "16px";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: radius,
          overflow: "hidden",
          boxShadow:
            phase === "from"
              ? "0 0 0 2px rgba(255,255,255,0.45), 0 6px 20px rgba(0,0,0,0.6)"
              : "0 20px 60px rgba(0,0,0,0.6)",
          opacity: phase === "settle" ? 0 : 1,
          transition:
            "left 720ms cubic-bezier(0.22, 1, 0.36, 1)," +
            "top 720ms cubic-bezier(0.22, 1, 0.36, 1)," +
            "width 720ms cubic-bezier(0.22, 1, 0.36, 1)," +
            "height 720ms cubic-bezier(0.22, 1, 0.36, 1)," +
            "border-radius 720ms cubic-bezier(0.22, 1, 0.36, 1)," +
            "box-shadow 720ms ease," +
            "opacity 320ms ease",
          willChange: "left, top, width, height, border-radius",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
