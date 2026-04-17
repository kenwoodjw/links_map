"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapGL, Marker, type MapRef } from "react-map-gl/maplibre";
import type { Location, BucketStatus } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";
import { useAllNotes } from "@/lib/notes";
import { locations as allLocations } from "@/lib/locations";
import { greatCirclePoints } from "@/lib/greatCircle";

type Props = {
  locations: Location[];
  onSelect: (loc: Location) => void;
  flyTarget: Location | null;
  regionTarget: { lng: number; lat: number; zoom: number } | null;
  autoRotate: boolean;
};

// CARTO's free dark-matter vector style — no API key required.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function ringColor(status: BucketStatus): string {
  if (status === "visited") return "#10b981"; // emerald
  if (status === "wishlist") return "#f59e0b"; // amber
  return "rgba(255,255,255,0.45)";
}

/**
 * "Deep Ocean" palette — dark continents floating on a desaturated navy sea,
 * keeping the globe calm so thumbnail markers remain the visual lead.
 *
 * Design tokens (centralized for easy iteration):
 *   --earth-ocean    : ocean fill (visible but desaturated)
 *   --earth-land     : land mass — slightly darker than ocean (continents as "voids")
 *   --earth-landuse  : parks / forests / landcover — barely different from land (1-2% lighter)
 *   --earth-border   : admin lines — subtle cyan, ~25% opacity
 *   --earth-label    : place labels — dim, recedes behind markers
 */
const EARTH = {
  ocean: "#0e2a4a",
  land: "#0a1526",
  landuse: "#0d1a2f",
  border: "rgba(110,170,220,0.22)",
  label: "rgba(200,220,240,0.55)",
  labelHalo: "rgba(5,12,24,0.9)",
};

function applyBluePalette(map: maplibregl.Map) {
  const layers = map.getStyle().layers ?? [];
  for (const layer of layers) {
    const id = layer.id;
    const type = layer.type;
    try {
      if (id === "background") {
        map.setPaintProperty(id, "background-color", EARTH.land);
        continue;
      }
      if (id.includes("water") || id.includes("ocean") || id.includes("sea")) {
        if (type === "fill") map.setPaintProperty(id, "fill-color", EARTH.ocean);
        else if (type === "line") map.setPaintProperty(id, "line-color", EARTH.ocean);
        continue;
      }
      if (
        id.includes("landcover") ||
        id.includes("landuse") ||
        id.includes("park") ||
        id.includes("wood") ||
        id.includes("forest")
      ) {
        if (type === "fill") map.setPaintProperty(id, "fill-color", EARTH.landuse);
        continue;
      }
      if (id.includes("admin") || id.includes("boundary") || id.includes("border")) {
        if (type === "line") {
          map.setPaintProperty(id, "line-color", EARTH.border);
        }
        continue;
      }
      if (type === "symbol") {
        try {
          map.setPaintProperty(id, "text-color", EARTH.label);
          map.setPaintProperty(id, "text-halo-color", EARTH.labelHalo);
          map.setPaintProperty(id, "text-halo-width", 1.2);
        } catch {
          /* some symbol layers don't have these paints */
        }
      }
    } catch {
      /* layer missing that paint prop → ignore */
    }
  }
}

export default function GlobeMap({
  locations,
  onSelect,
  flyTarget,
  regionTarget,
  autoRotate,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const statuses = useAllBucketStatuses();
  const notes = useAllNotes();
  const rotationRafRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const stopRotate = useCallback(() => {
    if (rotationRafRef.current !== null) {
      cancelAnimationFrame(rotationRafRef.current);
      rotationRafRef.current = null;
    }
  }, []);

  // Fly-to a specific location
  useEffect(() => {
    if (flyTarget && mapRef.current) {
      stopRotate();
      mapRef.current.flyTo({
        center: [flyTarget.lng, flyTarget.lat],
        zoom: 4,
        duration: 1600,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget]);

  // Fly-to a region view
  useEffect(() => {
    if (regionTarget && mapRef.current) {
      stopRotate();
      mapRef.current.flyTo({
        center: [regionTarget.lng, regionTarget.lat],
        zoom: regionTarget.zoom,
        duration: 1800,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionTarget]);

  const startRotate = useCallback(() => {
    if (!autoRotate) return;
    stopRotate();
    const tick = () => {
      const map = mapRef.current?.getMap();
      if (!map || userInteractingRef.current) {
        rotationRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const center = map.getCenter();
      // ~6 degrees per second → a full rotation in a minute
      map.setCenter([center.lng + 0.1, center.lat]);
      rotationRafRef.current = requestAnimationFrame(tick);
    };
    rotationRafRef.current = requestAnimationFrame(tick);
  }, [autoRotate, stopRotate]);

  useEffect(() => {
    if (autoRotate) startRotate();
    else stopRotate();
    return stopRotate;
  }, [autoRotate, startRotate, stopRotate]);

  const handleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    // Enable globe projection
    if (map.setProjection) {
      map.setProjection({ type: "globe" });
    }
    // "Deep Ocean" atmosphere:
    //   - deep-space sky blends to a luminous cyan rim (the iconic "astronaut view")
    //   - fog on the night side stays near-black so the globe silhouette reads clean
    //   - atmosphere-blend dialed down from 1.0 → 0.75 so the rim glows rather than
    //     washing out the whole globe
    if (map.setSky) {
      map.setSky({
        "sky-color": "#030811",            // deep space, almost black
        "sky-horizon-blend": 0.55,
        "horizon-color": "#3d7fc4",        // cyan-blue rim glow
        "horizon-fog-blend": 0.5,
        "fog-color": "#030811",            // dark side fog matches space
        "fog-ground-blend": 0.05,
        "atmosphere-blend": 0.75,
      });
    }
    // Recolor the basemap layers to blue
    applyBluePalette(map);
    startRotate();
    setIsMapReady(true);
  };

  // "Journey trail" — gold great-circle arcs connecting visited locations in
  // chronological order (notes.visitedAt asc; undated entries trail, in array
  // order). Independent of the current filter prop, so the trail is always
  // visible as personal history.
  useEffect(() => {
    if (!isMapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const visited = allLocations
      .filter((l) => statuses[l.id] === "visited")
      .sort((a, b) => {
        const da = notes[a.id]?.visitedAt ?? "";
        const db = notes[b.id]?.visitedAt ?? "";
        if (da && db) return da.localeCompare(db);
        if (da) return -1;
        if (db) return 1;
        return 0;
      });

    const sourceId = "visited-arcs";
    type LineFeature = {
      type: "Feature";
      geometry: { type: "LineString"; coordinates: [number, number][] };
      properties: { index: number };
    };
    const features: LineFeature[] = [];
    for (let i = 0; i < visited.length - 1; i++) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: greatCirclePoints(
            [visited[i].lng, visited[i].lat],
            [visited[i + 1].lng, visited[i + 1].lat],
            64
          ),
        },
        properties: { index: i },
      });
    }
    const data = { type: "FeatureCollection" as const, features };

    const existing = map.getSource(sourceId) as
      | { setData: (d: unknown) => void }
      | undefined;
    if (existing) {
      existing.setData(data);
      return;
    }

    map.addSource(sourceId, { type: "geojson", data });
    // Soft outer glow — warm amber halo that reads at distance
    map.addLayer({
      id: "visited-arcs-glow",
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#fbbf24",
        "line-width": 4,
        "line-blur": 6,
        "line-opacity": 0.32,
      },
    });
    // Bright hairline core
    map.addLayer({
      id: "visited-arcs-core",
      type: "line",
      source: sourceId,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#fde68a",
        "line-width": 1.4,
        "line-opacity": 0.9,
      },
    });
  }, [isMapReady, statuses, notes]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: 30, latitude: 25, zoom: 1.2 }}
      minZoom={0.8}
      maxZoom={10}
      mapStyle={DARK_STYLE}
      onLoad={handleLoad}
      onMouseDown={() => (userInteractingRef.current = true)}
      onMouseUp={() => (userInteractingRef.current = false)}
      onTouchStart={() => (userInteractingRef.current = true)}
      onTouchEnd={() => (userInteractingRef.current = false)}
      onWheel={() => {
        userInteractingRef.current = true;
        setTimeout(() => (userInteractingRef.current = false), 1500);
      }}
      style={{ width: "100%", height: "100%", background: "#030811" }}
      attributionControl={{ compact: true }}
    >
      {locations.map((loc) => {
        const status: BucketStatus = statuses[loc.id] ?? null;
        const ring = ringColor(status);
        const first = loc.videos[0];
        const hasNote = Boolean(notes[loc.id]);
        const focused = flyTarget?.id === loc.id;
        const anyFocused = Boolean(flyTarget);
        const dimmed = anyFocused && !focused;
        return (
          <Marker
            key={loc.id}
            longitude={loc.lng}
            latitude={loc.lat}
            anchor="center"
            // Raise the focused marker; hover-based raising is handled by a
            // global CSS :has() rule (Marker doesn't accept `className`).
            style={focused ? { zIndex: 40 } : undefined}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(loc);
              }}
              className="group relative block cursor-pointer focus:outline-none"
              aria-label={loc.name}
              style={{
                width: 36,
                height: 36,
                opacity: dimmed ? 0.35 : 1,
                transform: focused
                  ? "scale(1.2)"
                  : dimmed
                  ? "scale(0.92)"
                  : "scale(1)",
                transition:
                  "opacity 0.45s ease, transform 0.45s cubic-bezier(0.34, 1.4, 0.6, 1)",
              }}
            >
              {/* Focused outer glow — soft pulsing halo */}
              {focused && (
                <span
                  aria-hidden
                  className="absolute -inset-3 rounded-full animate-[pulseGlow_2.2s_ease-in-out_infinite]"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)",
                  }}
                />
              )}
              {/* Ring */}
              <span
                className="absolute inset-0 rounded-full ring-2 ring-offset-0 transition-transform group-hover:scale-125"
                style={{
                  boxShadow: focused
                    ? `0 0 0 2px ${ring}, 0 0 0 5px rgba(255,255,255,0.25), 0 6px 24px rgba(0,0,0,0.7)`
                    : `0 0 0 2px ${ring}, 0 6px 20px rgba(0,0,0,0.6)`,
                }}
              />
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={first?.thumbnail}
                alt={loc.name}
                className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-125"
                loading="lazy"
              />
              {/* Status dot */}
              {status && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-black"
                  style={{ background: status === "visited" ? "#10b981" : "#f59e0b" }}
                />
              )}
              {/* Note badge — small sky-blue pencil dot */}
              {hasNote && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-400 ring-2 ring-black"
                  aria-label="有笔记"
                  title="有笔记"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-2 w-2 text-black/80">
                    <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM15.7 6.3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z" />
                  </svg>
                </span>
              )}
              {/* Hover preview card — appears immediately on hover */}
              <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 block w-52 -translate-x-1/2 -translate-y-1 overflow-hidden rounded-xl border border-white/15 bg-black/80 text-left opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                {/* Thumbnails area */}
                <span
                  className="relative grid w-full gap-px bg-black"
                  style={{
                    aspectRatio: "16 / 9",
                    gridTemplateColumns:
                      loc.videos.length >= 2 ? "1fr 1fr" : "1fr",
                  }}
                >
                  {/* First thumbnail (always shown) */}
                  <span className="relative block h-full w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={loc.videos[0]?.thumbnail}
                      alt=""
                      className="block h-full w-full object-cover"
                      loading="lazy"
                    />
                  </span>
                  {/* Second thumbnail (only when there are ≥ 2 videos) */}
                  {loc.videos.length >= 2 && (
                    <span className="relative block h-full w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={loc.videos[1]?.thumbnail}
                        alt=""
                        className="block h-full w-full object-cover"
                        loading="lazy"
                      />
                      {loc.videos.length > 2 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 font-serif text-lg font-medium text-white backdrop-blur-[1px]">
                          +{loc.videos.length - 1}
                        </span>
                      )}
                    </span>
                  )}
                  {/* Status micro-badges (top-left, mirror the marker) */}
                  {(status || hasNote) && (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
                      {status === "visited" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}
                      {status === "wishlist" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      )}
                      {hasNote && (
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                      )}
                    </span>
                  )}
                </span>
                {/* Text */}
                <span className="block px-3 py-2.5">
                  <span className="block truncate font-serif text-sm leading-tight text-white">
                    {loc.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-white/45">
                    {loc.country}
                  </span>
                </span>
              </span>
            </button>
          </Marker>
        );
      })}
    </MapGL>
  );
}
