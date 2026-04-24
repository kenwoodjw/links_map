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

const COUNTRY_REGION: Record<string, Region> = {
  中国: "asia",
  日本: "asia",
  也门: "asia",
  中东: "asia",
  俄罗斯: "asia",
  冰岛: "europe",
  葡萄牙: "europe",
  挪威: "europe",
  芬兰: "europe",
  英国: "europe",
  意大利: "europe",
  瑞典: "europe",
  瑞士: "europe",
  丹麦: "europe",
  奥地利: "europe",
  美国: "americas",
  加拿大: "americas",
  格陵兰: "polar",
  北极地区: "polar",
};

/**
 * Bucket locations by region. Named country/region wins first because geocoding
 * broad place names like "Arctic Circle" or "Middle East" can return bad points.
 */
export function regionOf(
  loc: Pick<Location, "lat" | "lng"> & Partial<Pick<Location, "country" | "name">>
): Region {
  const { lat, lng } = loc;
  if (lat > 66 || lat < -60) return "polar";
  if (loc.country && COUNTRY_REGION[loc.country]) return COUNTRY_REGION[loc.country];
  if (loc.name === "中东") return "asia";
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
