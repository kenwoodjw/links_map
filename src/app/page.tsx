"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { locations } from "@/lib/locations";
import LocationLightbox from "@/components/LocationLightbox";
import LocationList from "@/components/LocationList";
import TopHeader from "@/components/TopHeader";
import BottomBar, { type StatusFilter } from "@/components/BottomBar";
import StarField from "@/components/StarField";
import { regionOf, REGION_VIEW, type Region } from "@/lib/regions";
import { useAllBucketStatuses } from "@/lib/bucketList";
import { useAllNotes } from "@/lib/notes";
import type { Location } from "@/lib/types";

const GlobeMap = dynamic(() => import("@/components/GlobeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-black text-white/50 text-sm tracking-widest">
      加载地球...
    </div>
  ),
});

export default function Home() {
  const [selected, setSelected] = useState<Location | null>(null);
  const [flyTarget, setFlyTarget] = useState<Location | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const bucketStatuses = useAllBucketStatuses();
  const allNotes = useAllNotes();

  const availableRegions = useMemo(() => {
    const set = new Set<Region>();
    for (const l of locations) set.add(regionOf(l));
    return [...set];
  }, []);

  const filtered = useMemo(() => {
    return locations.filter((l) => {
      const s = bucketStatuses[l.id] ?? null;
      if (status === "visited" && s !== "visited") return false;
      if (status === "wishlist" && s !== "wishlist") return false;
      if (region !== "all" && regionOf(l) !== region) return false;
      return true;
    });
  }, [bucketStatuses, status, region]);

  const counts = useMemo(() => {
    let visited = 0;
    let wishlist = 0;
    for (const l of locations) {
      const s = bucketStatuses[l.id];
      if (s === "visited") visited++;
      else if (s === "wishlist") wishlist++;
    }
    return { visited, wishlist };
  }, [bucketStatuses]);

  const handleSelect = (loc: Location) => {
    setFlyTarget(loc);
    setSelected(loc);
  };

  const handleSurprise = () => {
    const notCurrent = (loc: Location) =>
      loc.id !== selected?.id && loc.id !== flyTarget?.id;

    const wishlist = filtered.filter(
      (loc) => bucketStatuses[loc.id] === "wishlist" && notCurrent(loc)
    );
    const pool =
      wishlist.length > 0
        ? wishlist
        : filtered.filter(
            (loc) => bucketStatuses[loc.id] !== "visited" && notCurrent(loc)
          );
    const fallback = filtered.filter(notCurrent);
    const source = pool.length > 0 ? pool : fallback;

    if (source.length === 0) return;
    const next = source[Math.floor(Math.random() * source.length)];
    handleSelect(next);
  };

  const regionTarget = region === "all" ? null : REGION_VIEW[region];

  // "Clean mode" — press H to fade all HUD.
  const [hudHidden, setHudHidden] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === "h") {
        setHudHidden((prev) => {
          if (!prev) setHintVisible(true);
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  useEffect(() => {
    if (!hintVisible) return;
    const t = setTimeout(() => setHintVisible(false), 3000);
    return () => clearTimeout(t);
  }, [hintVisible]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <GlobeMap
        locations={filtered}
        onSelect={handleSelect}
        flyTarget={flyTarget}
        regionTarget={regionTarget}
        autoRotate={selected === null && flyTarget === null && region === "all"}
        lightboxOpen={selected !== null}
      />
      <StarField />
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 85%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      {/* Top scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,8,17,0.55), transparent)",
        }}
      />
      {/* Bottom scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32"
        style={{
          background: "linear-gradient(to top, rgba(3,8,17,0.55), transparent)",
        }}
      />
      {/* Right gradient — subtle backdrop behind the open lightbox */}
      {selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[460px] transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.75) 100%)",
          }}
        />
      )}

      {/* HUD */}
      <div
        className={`transition-opacity duration-500 ${
          hudHidden ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <LocationList
          locations={filtered}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
        <TopHeader
          total={locations.length}
          visited={counts.visited}
          wishlist={counts.wishlist}
          notes={Object.keys(allNotes).length}
        />
        <BottomBar
          status={status}
          onStatus={setStatus}
          region={region}
          onRegion={setRegion}
          availableRegions={availableRegions}
          onSurprise={handleSurprise}
        />
      </div>

      {/* Clean-mode hint */}
      {hudHidden && hintVisible && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[11px] tracking-[0.2em] text-white/75 backdrop-blur-md animate-[fadeIn_0.3s_ease]"
        >
          按{" "}
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">
            H
          </kbd>{" "}
          恢复界面
        </div>
      )}

      <LocationLightbox
        location={selected}
        onClose={() => {
          setSelected(null);
          setFlyTarget(null);
        }}
      />
    </div>
  );
}
