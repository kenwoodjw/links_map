"use client";

import { useEffect, useState } from "react";
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
  window.dispatchEvent(new CustomEvent("links_map:bucket-changed", { detail: { id, status: s } }));
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

/** React hook: subscribes to status of one location. */
export function useBucketStatus(id: string): [BucketStatus, (s: BucketStatus) => void] {
  const [s, setS] = useState<BucketStatus>(null);
  useEffect(() => {
    setS(getStatus(id));
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; status: BucketStatus }>;
      if (ce.detail.id === id) setS(ce.detail.status);
    };
    window.addEventListener("links_map:bucket-changed", handler);
    return () => window.removeEventListener("links_map:bucket-changed", handler);
  }, [id]);
  return [s, (next) => setStatus(id, next)];
}

/** React hook: subscribes to the full map of statuses. */
export function useAllBucketStatuses(): Record<string, BucketStatus> {
  const [all, setAll] = useState<Record<string, BucketStatus>>({});
  useEffect(() => {
    setAll(getAllStatuses());
    const handler = () => setAll(getAllStatuses());
    window.addEventListener("links_map:bucket-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("links_map:bucket-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return all;
}
