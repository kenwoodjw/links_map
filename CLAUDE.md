# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # dev server at localhost:3000
pnpm build      # production build
pnpm lint       # ESLint
```

### Data pipeline (one-time / refresh locations)

```bash
# 1. Fetch YouTube channel metadata (requires yt-dlp)
yt-dlp --flat-playlist --dump-single-json https://www.youtube.com/@linksphotograph/videos > raw/channel.json

# 2. AI-extract locations from video titles (needs DEEPSEEK_API_KEY or ANTHROPIC_API_KEY in .env.local)
pnpm tsx scripts/extract-locations.ts   # → raw/locations-raw.json

# 3. Geocode to lat/lng (Nominatim, 1 req/sec, ~5 min for 30+ locations)
pnpm tsx scripts/geocode.ts             # → data/locations.json
```

## Architecture

**Purpose:** Interactive 3D globe travel map for YouTube channel @linksphotograph. Users browse 30+ filmed locations, watch embedded videos, and maintain a personal bucket list (visited / wishlist) stored in localStorage.

### Data flow

```
raw/channel.json  →  extract-locations.ts (AI)  →  raw/locations-raw.json
                  →  geocode.ts (Nominatim)      →  data/locations.json  (committed)
                                                            ↓
                                                  src/lib/locations.ts (static import)
                                                            ↓
                                                  React components
```

`data/locations.json` is the only runtime data file. No backend, no env vars required for the frontend.

### State management

All user state lives in **localStorage** with two namespaces:

| Prefix | Module | Hook |
|---|---|---|
| `links_map:bucket:` | `src/lib/bucketList.ts` | `useBucketStatus()`, `useAllBucketStatuses()` |
| `links_map:note:` | `src/lib/notes.ts` | `useNote()`, `useAllNotes()` |

Cross-component sync is done via custom DOM events (`links_map:bucket-changed`, `links_map:note-changed`) — not React context or Zustand. Hooks subscribe to these events to stay in sync.

### Component hierarchy

```
page.tsx  (orchestrates all state)
├── GlobeMap            — MapLibre GL globe; receives filtered locations + flyTarget
├── LocationList        — Left sidebar list; filtered locations, click → onSelect
├── LocationLightbox    — Right slide-in panel; video thumbnails, bucket-list controls, notes
├── TopHeader           — Stats bar (totals, visited, wishlist, notes count)
├── BottomBar           — Status + region filter chips
├── SurpriseButton      — Random unvisited location picker
└── StarField           — CSS star background
```

**Selection flow:** clicking a marker or list item calls `handleSelect(loc)` in `page.tsx`, which sets `flyTarget` (triggers map flyTo) and after 900 ms sets `selected` (opens the lightbox).

### GlobeMap internals

- MapLibre GL JS + `react-map-gl/maplibre`
- Two map styles toggled by remounting (`mapKey` increment + `key` prop): CARTO Dark Matter (vector) and NASA GIBS Blue Marble (raster, no API key)
- Globe projection: `map.setProjection({ type: "globe" })` on load
- Custom layers added imperatively after load: day/night terminator (`src/lib/terminator.ts`), great-circle journey arcs (`src/lib/greatCircle.ts`), "Deep Ocean" color palette (`applyBluePalette()`)
- Auto-rotation via `requestAnimationFrame`; paused during user interaction via `userInteractingRef`
- Hover cards are suppressed (`group-hover:` classes removed) when lightbox is open via `lightboxOpen` prop

### YouTube thumbnails

`src/lib/videoFrames.ts` emits two candidates per video: `maxresdefault.jpg` (HD, probed) then `hqdefault.jpg` (guaranteed fallback). `LocationLightbox` deduplicates by `videoId` — first valid candidate wins, so maxres is shown when it exists and hq is the silent fallback. The same `hqdefault.jpg` is used as a blurred placeholder during the sharp-image crossfade.

### Key type

```typescript
// src/lib/types.ts
type Location = {
  id: string; name: string; country: string;
  lat: number; lng: number;
  videos: VideoRef[];          // at least one
  confidence: number;          // AI extraction confidence 0–1
};
type VideoRef = { id: string; title: string; thumbnail: string };
type BucketStatus = "visited" | "wishlist" | null;
```
