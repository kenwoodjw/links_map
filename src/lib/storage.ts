"use client";

import { useMemo, useSyncExternalStore } from "react";

// String snapshots remain stable between storage events, including empty stores.
export function useLocalRecords<T>(
  prefix: string,
  event: string,
): Record<string, T> {
  const raw = useSyncExternalStore(
    (notify) => {
      window.addEventListener(event, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(event, notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => {
      const records: Record<string, T> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(prefix)) continue;
          const value = localStorage.getItem(key);
          if (value) {
            try {
              records[key.slice(prefix.length)] = JSON.parse(value) as T;
            } catch {
              /* Bucket statuses are stored as plain strings. */ records[
                key.slice(prefix.length)
              ] = value as T;
            }
          }
        }
      } catch {
        /* Storage may be unavailable; writes still report failure. */
      }
      return JSON.stringify(records);
    },
    () => "{}",
  );
  return useMemo(() => JSON.parse(raw) as Record<string, T>, [raw]);
}
