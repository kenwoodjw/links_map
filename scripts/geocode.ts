/**
 * Geocode extracted locations via Nominatim (OpenStreetMap).
 *
 * Reads:  raw/locations-raw.json
 * Writes: data/locations.json  (final frontend data)
 *         raw/geocode-cache.json  (cache; safe to commit optionally)
 *
 * Merges duplicate location mentions across videos into a single map pin
 * that carries a list of related video references.
 *
 * Rate limit: Nominatim fair-use = ~1 req/sec. We sleep 1100ms between calls.
 *
 * Run:  pnpm tsx scripts/geocode.ts
 */
import fs from "node:fs";
import path from "node:path";

type ExtractedLocation = {
  name: string;
  nameEn?: string;
  country: string;
  confidence: "high" | "medium" | "low";
};

type VideoLocations = {
  videoId: string;
  title: string;
  thumbnail: string;
  viewCount?: number;
  durationSec?: number;
  locations: ExtractedLocation[];
};

type NominatimHit = { lat: string; lon: string; display_name: string };
type CacheEntry = { lat: number; lng: number; resolvedName: string } | { failed: true };

const ROOT = path.resolve(import.meta.dirname, "..");
const IN_JSON = path.join(ROOT, "raw/locations-raw.json");
const OUT_JSON = path.join(ROOT, "data/locations.json");
const CACHE_JSON = path.join(ROOT, "raw/geocode-cache.json");

const UA = "links_map/0.1 (personal travel bucket list; contact: n/a)";

function slugify(name: string, country: string): string {
  const base = `${name}-${country}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || Math.random().toString(36).slice(2, 8);
}

async function geocode(query: string): Promise<NominatimHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=zh-CN,zh,en`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = (await res.json()) as NominatimHit[];
  return arr[0] ?? null;
}

async function main() {
  if (!fs.existsSync(IN_JSON)) {
    console.error(`❌ Missing ${IN_JSON}. Run extract-locations.ts first.`);
    process.exit(1);
  }
  const videos = JSON.parse(fs.readFileSync(IN_JSON, "utf8")) as VideoLocations[];
  const cache: Record<string, CacheEntry> = fs.existsSync(CACHE_JSON)
    ? JSON.parse(fs.readFileSync(CACHE_JSON, "utf8"))
    : {};

  // Collect unique locations keyed by "name|country"
  type Pin = {
    id: string;
    name: string;
    nameEn?: string;
    country: string;
    confidence: "high" | "medium" | "low";
    lat: number | null;
    lng: number | null;
    videos: { id: string; title: string; thumbnail: string; viewCount?: number; durationSec?: number }[];
  };
  const pins = new Map<string, Pin>();

  for (const v of videos) {
    for (const loc of v.locations) {
      const key = `${loc.name}|${loc.country}`;
      if (!pins.has(key)) {
        pins.set(key, {
          id: slugify(loc.nameEn || loc.name, loc.country),
          name: loc.name,
          nameEn: loc.nameEn,
          country: loc.country,
          confidence: loc.confidence,
          lat: null,
          lng: null,
          videos: [],
        });
      }
      const pin = pins.get(key)!;
      // Keep highest confidence
      if (loc.confidence === "high") pin.confidence = "high";
      else if (loc.confidence === "medium" && pin.confidence === "low") pin.confidence = "medium";
      pin.videos.push({
        id: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        viewCount: v.viewCount,
        durationSec: v.durationSec,
      });
    }
  }

  console.log(`📍 ${pins.size} unique locations to geocode`);

  let i = 0;
  for (const [key, pin] of pins) {
    i++;
    const queries = [
      `${pin.nameEn ?? pin.name}, ${pin.country}`,
      `${pin.name}, ${pin.country}`,
      pin.nameEn ?? pin.name,
    ];
    let hit: NominatimHit | null = null;
    const cacheKey = queries[0];
    if (cache[cacheKey]) {
      const c = cache[cacheKey];
      if ("failed" in c) {
        console.log(`[${i}/${pins.size}] ${pin.name} — cached miss`);
        continue;
      }
      pin.lat = c.lat;
      pin.lng = c.lng;
      console.log(`[${i}/${pins.size}] ${pin.name} → (cached) ${c.lat}, ${c.lng}`);
      continue;
    }

    for (const q of queries) {
      try {
        hit = await geocode(q);
      } catch (e) {
        console.warn(`⚠️  ${q}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 1100));
      if (hit) break;
    }

    if (hit) {
      pin.lat = parseFloat(hit.lat);
      pin.lng = parseFloat(hit.lon);
      cache[cacheKey] = { lat: pin.lat, lng: pin.lng, resolvedName: hit.display_name };
      console.log(`[${i}/${pins.size}] ${pin.name} → ${pin.lat.toFixed(3)}, ${pin.lng.toFixed(3)}`);
    } else {
      cache[cacheKey] = { failed: true };
      console.log(`[${i}/${pins.size}] ${pin.name} → ❌ no match`);
    }
    if (i % 5 === 0) fs.writeFileSync(CACHE_JSON, JSON.stringify(cache, null, 2));
  }

  fs.writeFileSync(CACHE_JSON, JSON.stringify(cache, null, 2));

  // Final: only keep pins with coordinates
  const final = [...pins.values()]
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      lat: p.lat as number,
      lng: p.lng as number,
      confidence: p.confidence,
      videos: p.videos,
    }));

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(final, null, 2));
  console.log(`✅ Wrote ${final.length} geocoded locations → ${OUT_JSON}`);
  console.log(`   (${pins.size - final.length} failed — check raw/geocode-cache.json)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
