"use client";

import { useSyncExternalStore } from "react";

/**
 * A single string in `localStorage`, exposed as an external store.
 *
 * Server snapshot is always `""` so hydration is stable; React re-reads on the
 * client immediately after hydration.
 */
const cache = new Map<string, { value: string; hydrated: boolean }>();
const listeners = new Map<string, Set<() => void>>();

function entry(key: string) {
  let record = cache.get(key);
  if (!record) {
    record = { value: "", hydrated: false };
    cache.set(key, record);
  }
  return record;
}

function listenerSet(key: string) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

export function useLocalStorageString(key: string): string {
  return useSyncExternalStore(
    (onChange) => {
      const set = listenerSet(key);
      set.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) {
          entry(key).hydrated = false;
          for (const listener of set) listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => {
      const record = entry(key);
      if (!record.hydrated) {
        record.value = window.localStorage.getItem(key) ?? "";
        record.hydrated = true;
      }
      return record.value;
    },
    () => "",
  );
}

export function writeLocalStorageString(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);

  const record = entry(key);
  record.value = value ?? "";
  record.hydrated = true;
  for (const listener of listenerSet(key)) listener();
}
