"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface SearchBarProps {
  initialValue?: string;
  /** Where results land. The query is appended as `?q=`. */
  action?: string;
  placeholder?: string;
  className?: string;
  /** Milliseconds to wait after the last keystroke. */
  debounceMs?: number;
  /** Params carried over untouched so typing does not wipe active filters. */
  preserve?: Record<string, string>;
}

/**
 * All three pieces of state live in one object so we can tell an external URL
 * change (Reset link, back button) apart from our own keystrokes — without
 * reaching for a ref or an effect that writes state.
 *
 *   url    → the `q` we last saw from the server
 *   value  → what is in the input
 *   pushed → the last value we sent to the router
 */
export function SearchBar({
  initialValue = "",
  action = "/discover",
  placeholder = "Search repositories, topics, languages…",
  className,
  debounceMs = 400,
  preserve,
}: SearchBarProps) {
  const router = useRouter();
  const [state, setState] = useState({ url: initialValue, value: initialValue, pushed: initialValue });

  if (state.url !== initialValue) {
    setState({ url: initialValue, value: initialValue, pushed: initialValue });
  }

  const setValue = useCallback((next: string) => {
    setState((previous) => ({ ...previous, value: next }));
  }, []);

  const buildHref = useCallback(
    (next: string) => {
      const params = new URLSearchParams();
      for (const [key, preserved] of Object.entries(preserve ?? {})) {
        if (preserved) params.set(key, preserved);
      }
      if (next.trim()) params.set("q", next.trim());
      const query = params.toString();
      return query ? `${action}?${query}` : action;
    },
    [action, preserve],
  );

  const push = useCallback(
    (next: string) => {
      setState((previous) => ({ ...previous, pushed: next }));
      router.replace(buildHref(next), { scroll: false });
    },
    [buildHref, router],
  );

  useEffect(() => {
    if (state.value === state.pushed) return;
    const timer = setTimeout(() => push(state.value), debounceMs);
    return () => clearTimeout(timer);
  }, [state.value, state.pushed, debounceMs, push]);

  return (
    <form
      role="search"
      className={cn("relative w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        push(state.value);
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/30"
      />
      <input
        type="search"
        name="q"
        value={state.value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Search repositories"
        className="h-10 w-full rounded-full border border-white/10 bg-white/5 pr-9 pl-10 text-sm text-white/90 placeholder:text-white/30 transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:bg-white/[0.07] focus:outline-none"
      />
      {state.value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            push("");
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-white/30 transition-colors duration-200 hover:bg-white/10 hover:text-white/70"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </form>
  );
}
