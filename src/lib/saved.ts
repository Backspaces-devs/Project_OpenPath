"use client";

/**
 * Saved repositories.
 *
 * With Supabase connected these live in `collections` / `collection_items`.
 * Without it they live in `localStorage` — still the visitor's own real data,
 * just scoped to this browser. Nothing here is seeded or fabricated.
 *
 * Exposed through `useSyncExternalStore` so React treats it as an external
 * store rather than state we push into an effect.
 */
import { useSyncExternalStore } from "react";

export const SAVED_STORAGE_KEY = "openpath:saved:v1";
export const SAVED_EVENT = "openpath:saved-changed";

const EMPTY: string[] = [];

function readRaw(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return EMPTY;
  }
}

let snapshot: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function getSnapshot(): string[] {
  if (!hydrated) {
    snapshot = readRaw();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function emit(): void {
  snapshot = readRaw();
  hydrated = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SAVED_STORAGE_KEY) emit();
  };
  window.addEventListener(SAVED_EVENT, emit);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(SAVED_EVENT, emit);
    window.removeEventListener("storage", onStorage);
  };
}

/** Live list of saved `owner/repo` slugs. */
export function useSavedRepos(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeSaved(items: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    // Private browsing or a full quota — saving is a nicety, not a feature gate.
  }
  emit();
}

export function toggleSaved(fullName: string): void {
  const current = getSnapshot();
  writeSaved(
    current.includes(fullName) ? current.filter((item) => item !== fullName) : [fullName, ...current],
  );
}
