"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapGL, Marker, type MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import type { Location, BucketStatus } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";
import { useAllNotes } from "@/lib/notes";
import { locations as allLocations } from "@/lib/locations";
import { greatCirclePoints } from "@/lib/greatCircle";
import { terminatorFeatures } from "@/lib/terminator";

type Props = {
  locations: Location[];
  onSelect: (loc: Location) => void;
  flyTarget: Location | null;
  regionTarget: { lng: number; lat: number; zoom: number } | null;
  autoRotate: boolean;
  lightboxOpen: boolean;
};

// CARTO's free dark-matter vector style — no API key required.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// NASA GIBS Blue Marble (MODIS Terra composite, EPSG:3857 WMTS tiles).
// Free, no API key needed. maxzoom 8 is well above our globe's maxZoom 5.5.
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    "blue-marble": {
      type: "raster",
      tiles: [
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
      ],
      tileSize: 256,
      maxzoom: 8,
      attribution: "Imagery NASA/GSFC EOSDIS GIBS",
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#020408" } },
    { id: "satellite", type: "raster", source: "blue-marble" },
  ],
} satisfies StyleSpecification;

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
  // Restored to natural hierarchy: land reads brighter than ocean so continents
  // feel solid instead of void. Still deep/desaturated overall so markers lead.
  ocean: "#091a2e",
  land: "#1a2b44",
  landuse: "#1f3250",
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
        // Hide all labels below zoom 3 — at globe-wide view the text crowds
        // markers; once you zoom into a region, labels return as context.
        try {
          map.setLayerZoomRange(id, 3, 24);
        } catch {
          /* layer already has a stricter range */
        }
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
  lightboxOpen,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const statuses = useAllBucketStatuses();
  const notes = useAllNotes();
  const rotationRafRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  // Increment to force MapGL remount on style switch (cleanest way to reload layers).
  const [mapKey, setMapKey] = useState(0);

  const toggleStyle = () => {
    setIsMapReady(false);
    setIsSatellite((prev) => !prev);
    setMapKey((k) => k + 1);
  };

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
    if (map.setSky) {
      map.setSky(
        isSatellite
          ? {
              // Satellite: thin realistic atmosphere over photographed Earth
              "sky-color": "#020408",
              "sky-horizon-blend": 0.38,
              "horizon-color": "#1a6baa",
              "horizon-fog-blend": 0.28,
              "fog-color": "#020408",
              "fog-ground-blend": 0.02,
              "atmosphere-blend": 0.5,
            }
          : {
              // Dark vector: deep-space sky with luminous cyan rim
              "sky-color": "#030811",
              "sky-horizon-blend": 0.55,
              "horizon-color": "#3d7fc4",
              "horizon-fog-blend": 0.5,
              "fog-color": "#030811",
              "fog-ground-blend": 0.05,
              "atmosphere-blend": 0.75,
            }
      );
    }
    // Vector style only — satellite uses raster tiles with no recolorable layers
    if (!isSatellite) applyBluePalette(map);
    startRotate();
    setIsMapReady(true);
  };

  // Day/night terminator — a translucent dark fill over the night hemisphere
  // plus a soft amber rim along the terminator itself (sunrise/sunset glow).
  // Refreshes every 60s so the shadow quietly rolls across the globe as you
  // browse, hinting "this is a real planet turning in real time".
  useEffect(() => {
    if (!isMapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const polySource = "night-shadow";
    const lineSource = "terminator-rim";

    const apply = () => {
      const { polygon, line } = terminatorFeatures();
      const poly = map.getSource(polySource) as
        | { setData: (d: unknown) => void }
        | undefined;
      const rim = map.getSource(lineSource) as
        | { setData: (d: unknown) => void }
        | undefined;
      if (poly && rim) {
        poly.setData(polygon);
        rim.setData(line);
        return;
      }

      // Keep shadow/rim *below* visited arcs so the journey line always
      // reads bright, regardless of which effect registers first.
      const beforeId = map.getLayer("visited-arcs-glow")
        ? "visited-arcs-glow"
        : undefined;

      if (!poly) {
        map.addSource(polySource, { type: "geojson", data: polygon });
        map.addLayer(
          {
            id: "night-shadow-fill",
            type: "fill",
            source: polySource,
            paint: {
              "fill-color": "#000000",
              "fill-opacity": 0.32,
              "fill-antialias": true,
            },
          },
          beforeId
        );
      }
      if (!rim) {
        map.addSource(lineSource, { type: "geojson", data: line });
        map.addLayer(
          {
            id: "terminator-rim-glow",
            type: "line",
            source: lineSource,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#f59e0b",
              "line-width": 2.5,
              "line-blur": 5,
              "line-opacity": 0.35,
            },
          },
          beforeId
        );
      }
    };

    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, [isMapReady]);

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
    <>
    <MapGL
      key={mapKey}
      ref={mapRef}
      initialViewState={{ longitude: 110, latitude: 30, zoom: 1.35, pitch: 22 }}
      minZoom={1.1}
      maxZoom={5.5}
      mapStyle={isSatellite ? SATELLITE_STYLE : DARK_STYLE}
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
              {/* Wishlist beam — amber "light column" rising from the marker,
                  so "still-to-visit" points are visible even from globe-wide zoom */}
              {status === "wishlist" && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: "100%", width: 2, height: 44 }}
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(251,191,36,0.9) 0%, rgba(251,191,36,0.5) 45%, rgba(251,191,36,0) 100%)",
                      filter: "drop-shadow(0 0 3px rgba(251,191,36,0.65))",
                    }}
                  />
                  {/* Soft pulsing tip — gentle "calling you" cue */}
                  <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2">
                    <span
                      className="absolute inset-0 rounded-full animate-[pulseGlow_2.8s_ease-in-out_infinite]"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(253,230,138,0.95) 0%, rgba(251,191,36,0.4) 45%, rgba(251,191,36,0) 75%)",
                      }}
                    />
                  </span>
                </span>
              )}
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
              <span className={`pointer-events-none absolute left-1/2 top-full z-30 mt-2 block w-72 -translate-x-1/2 -translate-y-1 overflow-hidden rounded-xl border border-white/15 bg-black/80 text-left opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 ease-out ${!lightboxOpen ? "group-hover:translate-y-0 group-hover:opacity-100" : ""}`}>
                {/* Thumbnails — all videos tiled, no "+N" cap */}
                {(() => {
                  const n = loc.videos.length;
                  // cols: 1→1, 2→2 (side-by-side at 16/9 each), 3-4→2 (2×2),
                  // 5-6→3 (2-row), else 3
                  const cols = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 2 : 3;
                  // Each cell should stay near 16/9. Container height = rows × (cellW × 9/16).
                  // With n=2 cols=2 rows=1: container = 32/9 ratio (flat but each cell is 16/9 ✓)
                  // With n=3 cols=2 rows=2: 16/9 container (video[0] spans both cols in row 1)
                  // With n=4 cols=2 rows=2: 16/9 container (2×2 cells each 16/9 ✓)
                  const rows = Math.ceil(n / cols);
                  const aspectW = cols * 16;
                  const aspectH = rows * 9;
                  return (
                    <span
                      className="relative grid w-full gap-px bg-black"
                      style={{
                        aspectRatio: `${aspectW} / ${aspectH}`,
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      }}
                    >
                      {loc.videos.map((video, vi) => (
                        <span
                          key={vi}
                          className="relative overflow-hidden"
                          // For exactly 3 videos: first spans both cols as a "hero" top row
                          style={n === 3 && vi === 0 ? { gridColumn: "span 2" } : undefined}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={video.thumbnail}
                            alt=""
                            className="block h-full w-full object-cover"
                            loading="lazy"
                          />
                        </span>
                      ))}
                      {/* Status micro-badges */}
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
                  );
                })()}
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

    {/* Style toggle — satellite ↔ dark vector */}
    <button
      onClick={toggleStyle}
      title={isSatellite ? "切换为深色地图" : "切换为卫星图像"}
      aria-label={isSatellite ? "切换为深色地图" : "切换为卫星图像"}
      className="absolute bottom-[78px] right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white/75 shadow-md backdrop-blur-md transition-all hover:border-white/40 hover:bg-black/70 hover:text-white sm:bottom-[78px] sm:right-5"
    >
      {isSatellite ? (
        // Vector map icon
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.93 5.82C3.08 7.34 2 9.58 2 12c0 .78.1 1.54.29 2.26L6 10.5l1.5 3 2-4.5 1 2h3l-2.5 5H10a8 8 0 01-5.07-9.18zM14.5 17.2l-1-3.7H11l2-4 2 2.5 1.5-3 1.21 1.21A7.97 7.97 0 0118 12c0 2.42-1.08 4.66-2.93 6.18l-.57-.98z" clipRule="evenodd" />
        </svg>
      ) : (
        // Satellite icon
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 010 2H3a1 1 0 01-1-1zm9-9a1 1 0 011 1v2a1 1 0 01-2 0V3a1 1 0 011-1zm0 12a1 1 0 011 1v2a1 1 0 01-2 0v-2a1 1 0 011-1zm7-4a1 1 0 01-1 1h-2a1 1 0 010-2h2a1 1 0 011 1zM5.05 6.464A1 1 0 106.465 5.05l-1.414-1.414A1 1 0 003.636 5.05l1.414 1.414zm9.9 9.9a1 1 0 001.414-1.414l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414zM5.05 13.536a1 1 0 010 1.414l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414a1 1 0 011.414 0zm9.9-9.9a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414l-1.414-1.414a1 1 0 010-1.414zM10 7a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      )}
    </button>
    </>
  );
}
