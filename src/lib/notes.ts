"use client";

import { useLocalRecords } from "./storage";

export type Note = {
  /** free-form text */
  text: string;
  /** visit date in YYYY-MM-DD, or null if not specified */
  visitedAt: string | null;
  /** unix ms of last edit */
  updatedAt: number;
};

const KEY_PREFIX = "links_map:note:";
const EVENT = "links_map:note-changed";

export function getNote(id: string): Note | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Note;
    if (typeof parsed.text !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setNote(id: string, note: Note | null) {
  if (typeof window === "undefined") return;
  if (note === null || (note.text.trim() === "" && !note.visitedAt)) {
    window.localStorage.removeItem(KEY_PREFIX + id);
  } else {
    window.localStorage.setItem(KEY_PREFIX + id, JSON.stringify(note));
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id, note } }));
}

export function getAllNotes(): Record<string, Note> {
  if (typeof window === "undefined") return {};
  const out: Record<string, Note> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const id = k.slice(KEY_PREFIX.length);
    const v = window.localStorage.getItem(k);
    if (!v) continue;
    try {
      const parsed = JSON.parse(v) as Note;
      if (typeof parsed.text === "string") out[id] = parsed;
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

export function useNote(
  id: string,
): [Note | null, (next: Note | null) => void] {
  const all = useAllNotes();
  return [all[id] ?? null, (next) => setNote(id, next)];
}

export function useAllNotes(): Record<string, Note> {
  const all = useLocalRecords<Note>(KEY_PREFIX, EVENT);
  return Object.fromEntries(
    Object.entries(all).filter(
      ([, value]) => value && typeof value.text === "string",
    ),
  );
}

/** Human-readable "saved just now / 3 min ago". */
export function formatSavedAgo(updatedAt: number, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (sec < 5) return "刚刚";
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const d = new Date(updatedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
