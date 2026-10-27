"use client";

import { useLocalRecords } from "./storage";
import type { BucketStatus } from "./types";

const KEY_PREFIX = "links_map:bucket:";

export function getStatus(id: string): BucketStatus {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY_PREFIX + id);
  return v === "visited" || v === "wishlist" ? v : null;
}

export function setStatus(id: string, s: BucketStatus) {
  if (typeof window === "undefined") return;
  if (s === null) window.localStorage.removeItem(KEY_PREFIX + id);
  else window.localStorage.setItem(KEY_PREFIX + id, s);
  window.dispatchEvent(
    new CustomEvent("links_map:bucket-changed", { detail: { id, status: s } }),
  );
}

/** All statuses at once, so the map can color every pin without N listeners. */
export function getAllStatuses(): Record<string, BucketStatus> {
  if (typeof window === "undefined") return {};
  const out: Record<string, BucketStatus> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) {
      const id = k.slice(KEY_PREFIX.length);
      const v = window.localStorage.getItem(k);
      if (v === "visited" || v === "wishlist") out[id] = v;
    }
  }
  return out;
}

/** Storage-backed snapshots hydrate before they can overwrite a saved value. */
export function useBucketStatus(
  id: string,
): [BucketStatus, (s: BucketStatus) => void] {
  const all = useAllBucketStatuses();
  return [all[id] ?? null, (next) => setStatus(id, next)];
}

export function useAllBucketStatuses(): Record<string, BucketStatus> {
  const all = useLocalRecords<BucketStatus>(
    KEY_PREFIX,
    "links_map:bucket-changed",
  );
  return Object.fromEntries(
    Object.entries(all).filter(
      ([, value]) => value === "visited" || value === "wishlist",
    ),
  );
}
