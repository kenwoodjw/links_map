"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { locations } from "@/lib/locations";
import LocationLightbox from "@/components/LocationLightbox";
import TopHeader from "@/components/TopHeader";
import BottomBar, { type StatusFilter } from "@/components/BottomBar";
import RegionBreadcrumb from "@/components/RegionBreadcrumb";
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
    setTimeout(() => setSelected(loc), 900);
  };

  const regionTarget = region === "all" ? null : REGION_VIEW[region];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <GlobeMap
        locations={filtered}
        onSelect={handleSelect}
        flyTarget={flyTarget}
        regionTarget={regionTarget}
        autoRotate={selected === null && flyTarget === null && region === "all"}
      />
      {/* Vignette: pulls focus toward the globe, adds cinematic depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      {/* Top/bottom scrim: guarantees legibility for header/bottom-bar over any point of the globe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,8,17,0.55), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32"
        style={{
          background:
            "linear-gradient(to top, rgba(3,8,17,0.55), transparent)",
        }}
      />
      <TopHeader
        total={locations.length}
        visited={counts.visited}
        wishlist={counts.wishlist}
        notes={Object.keys(allNotes).length}
      />
      <RegionBreadcrumb region={region} onClear={() => setRegion("all")} />
      <BottomBar
        status={status}
        onStatus={setStatus}
        region={region}
        onRegion={setRegion}
        availableRegions={availableRegions}
      />
      <LocationLightbox
        location={selected}
        onClose={() => {
          setSelected(null);
          setFlyTarget(null);
        }}
      />
      {/* hidden but kept for a11y */}
      <button
        onClick={() => {
          const random = filtered[Math.floor(Math.random() * filtered.length)];
          if (random) handleSelect(random);
        }}
        className="sr-only"
        aria-hidden
      >
        shuffle
      </button>
    </div>
  );
}
