"use client";

import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Elixir",
  "Zig",
  "Lua",
  "Shell",
];

const COOKIE = "openpath_languages";
const MAX = 8;
const EMPTY: string[] = [];

function readCookie(): string[] {
  if (typeof document === "undefined") return EMPTY;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!match) return EMPTY;
  return decodeURIComponent(match[1])
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

let snapshot: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function getSnapshot(): string[] {
  if (!hydrated) {
    snapshot = readCookie();
    hydrated = true;
  }
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: string[]): void {
  snapshot = next;
  hydrated = true;
  document.cookie = `${COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=31536000; samesite=lax`;
  for (const listener of listeners) listener();
}

export function LanguagePicker() {
  const selected = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const toggle = (language: string) => {
    commit(
      selected.includes(language)
        ? selected.filter((value) => value !== language)
        : [...selected, language].slice(0, MAX),
    );
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {OPTIONS.map((language) => {
        const active = selected.includes(language);
        return (
          <button
            key={language}
            type="button"
            onClick={() => toggle(language)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-200",
              active
                ? "border-white/20 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/[0.09] hover:text-white/90",
            )}
          >
            {active ? <Check className="size-3" aria-hidden /> : null}
            {language}
          </button>
        );
      })}

      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => commit(EMPTY)}
          className="rounded-full px-3 py-1.5 text-xs text-white/30 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/70"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
