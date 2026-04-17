import type { Location } from "./types";

export type Region = "asia" | "europe" | "americas" | "africa" | "oceania" | "polar";

export const REGION_LABEL: Record<Region, string> = {
  asia: "亚洲",
  europe: "欧洲",
  americas: "美洲",
  africa: "非洲",
  oceania: "大洋洲",
  polar: "极地",
};

/** Center + zoom to fly to when a region chip is selected. */
export const REGION_VIEW: Record<Region, { lng: number; lat: number; zoom: number }> = {
  asia: { lng: 100, lat: 35, zoom: 2.2 },
  europe: { lng: 15, lat: 50, zoom: 2.6 },
  americas: { lng: -95, lat: 30, zoom: 2.0 },
  africa: { lng: 20, lat: 5, zoom: 2.2 },
  oceania: { lng: 140, lat: -25, zoom: 2.4 },
  polar: { lng: 0, lat: 78, zoom: 2.0 },
};

/** Rough region bucketing by lat/lng. Good enough for a ~30-100 location bucket list. */
export function regionOf(loc: Pick<Location, "lat" | "lng">): Region {
  const { lat, lng } = loc;
  if (lat > 66 || lat < -60) return "polar";
  // Americas: -170 to -30
  if (lng < -30) return "americas";
  // Africa: lng -20..55 & lat -35..20 (rough; overlap with Europe/Asia handled by order below)
  if (lng >= -20 && lng < 55 && lat < 20) return "africa";
  // Europe: lng -10..55 & lat 35..72
  if (lng >= -10 && lng < 55 && lat >= 35) return "europe";
  // Oceania: lng 100..180 & lat -50..-5
  if (lng >= 100 && lat < -5) return "oceania";
  // Asia: default for the rest
  return "asia";
}
