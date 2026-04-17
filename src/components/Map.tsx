"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapGL, Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import type { Location, BucketStatus } from "@/lib/types";
import { useAllBucketStatuses } from "@/lib/bucketList";

type Props = {
  locations: Location[];
  onSelect: (loc: Location) => void;
  flyTarget: Location | null;
};

type PointProps = { locationId: string };
type ClusterProps = { cluster: true; point_count: number; point_count_abbreviated: number };

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function colorFor(status: BucketStatus): string {
  if (status === "visited") return "#10b981"; // emerald-500
  if (status === "wishlist") return "#f59e0b"; // amber-500
  return "#64748b"; // slate-500
}

export default function Map({ locations, onSelect, flyTarget }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(1.6);
  const statuses = useAllBucketStatuses();

  // Build supercluster index once per locations list
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 50, maxZoom: 7 });
    sc.load(
      locations.map((l) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
        properties: { locationId: l.id },
      }))
    );
    return sc;
  }, [locations]);

  const clusters = useMemo(() => {
    if (!bounds) return [];
    return index.getClusters(bounds, Math.round(zoom));
  }, [bounds, zoom, index]);

  useEffect(() => {
    if (flyTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyTarget.lng, flyTarget.lat],
        zoom: Math.max(zoom, 6),
        duration: 1200,
        essential: true,
      });
    }
  }, [flyTarget, zoom]);

  const handleMove = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setZoom(map.getZoom());
  };

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: 20, latitude: 30, zoom: 1.6 }}
      mapStyle={MAP_STYLE}
      onLoad={handleMove}
      onMoveEnd={handleMove}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        const props = c.properties as ClusterProps | PointProps;
        if ("cluster" in props && props.cluster) {
          const count = props.point_count;
          const size = Math.min(44, 22 + count * 2);
          return (
            <Marker
              key={`cluster-${c.id}`}
              longitude={lng}
              latitude={lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                const expansion = index.getClusterExpansionZoom(Number(c.id));
                mapRef.current?.flyTo({ center: [lng, lat], zoom: expansion, duration: 600 });
              }}
            >
              <div
                className="flex items-center justify-center rounded-full bg-sky-600/90 text-white font-semibold shadow-lg ring-2 ring-white cursor-pointer hover:scale-105 transition-transform"
                style={{ width: size, height: size }}
              >
                {count}
              </div>
            </Marker>
          );
        }
        const p = props as PointProps;
        const loc = locations.find((l) => l.id === p.locationId);
        if (!loc) return null;
        const status = statuses[loc.id] ?? null;
        const color = colorFor(status);
        return (
          <Marker
            key={loc.id}
            longitude={lng}
            latitude={lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(loc);
            }}
          >
            <button
              className="group relative block cursor-pointer focus:outline-none"
              aria-label={loc.name}
            >
              <span
                className="block rounded-full shadow-lg ring-2 ring-white transition-transform group-hover:scale-125"
                style={{ width: 16, height: 16, background: color }}
              />
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {loc.name}
              </span>
            </button>
          </Marker>
        );
      })}
    </MapGL>
  );
}
