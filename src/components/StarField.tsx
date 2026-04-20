"use client";

import { useMemo } from "react";

const STAR_COUNT = 110;
const SEED = 73;

type Star = {
  x: number;        // %
  y: number;        // %
  r: number;        // px
  o: number;        // 0–1 base opacity
  twinkle: boolean;
  delay: number;    // s
};

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildStars(): Star[] {
  const rand = seededRandom(SEED);
  const out: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    out.push({
      x: rand() * 100,
      y: rand() * 100,
      r: 0.5 + rand() * 1.3,
      o: 0.25 + rand() * 0.45,
      twinkle: rand() < 0.18,
      delay: rand() * 6,
    });
  }
  return out;
}

/**
 * Ambient star field — 110 deterministically-placed white dots behind the
 * vignette and scrims, above the globe canvas. Uses a seeded RNG so SSR and
 * CSR output match, and a ~18% subset of stars gently twinkle.
 *
 * Kept subtle (opacity ≤ 0.7, size ≤ 1.8px): clearly present in the black
 * space surrounding the globe, barely perceptible over the globe itself —
 * reads as "cosmic dust", not noise.
 */
export default function StarField() {
  const stars = useMemo(buildStars, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5]"
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-white ${
            s.twinkle
              ? "animate-[twinkle_5s_ease-in-out_infinite]"
              : ""
          }`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.r}px`,
            height: `${s.r}px`,
            opacity: s.o,
            animationDelay: s.twinkle ? `${s.delay}s` : undefined,
            boxShadow:
              s.r > 1.3
                ? `0 0 ${(s.r * 1.8).toFixed(1)}px rgba(255,255,255,0.5)`
                : undefined,
          }}
        />
      ))}
    </div>
  );
}
