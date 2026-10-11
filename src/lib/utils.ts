import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names with Tailwind-aware conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Promise-based sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Split an array into chunks of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new RangeError("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/** Retry an async operation with exponential backoff. */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 3,
    delayMs = 300,
    factor = 2,
    maxDelayMs = 8_000,
    signal,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (signal?.aborted) throw error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const wait = Math.min(maxDelayMs, delayMs * factor ** (attempt - 1));
      await sleep(wait);
    }
  }
  throw lastError;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

/** 1_234 -> "1.2k", 12_345_678 -> "12.3M" */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs < 1_000) return String(Math.round(value));
  if (abs < 1_000_000) {
    const n = value / 1_000;
    return `${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)}k`;
  }
  const n = value / 1_000_000;
  return `${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)}M`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

const RELATIVE_STEPS: Array<[limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit]> = [
  [60, 1, "second"],
  [3_600, 60, "minute"],
  [86_400, 3_600, "hour"],
  [604_800, 86_400, "day"],
  [2_629_800, 604_800, "week"],
  [31_557_600, 2_629_800, "month"],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 days ago" / "2 months ago" — returns an em dash for missing input. */
export function formatRelativeTime(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  const then = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const seconds = (then - Date.now()) / 1_000;
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  for (const [limit, divisor, unit] of RELATIVE_STEPS) {
    if (abs < limit) return relativeFormatter.format(Math.round(seconds / divisor), unit);
  }
  return relativeFormatter.format(Math.round(seconds / 31_557_600), "year");
}

/** Whole days between a timestamp and now. Never negative. */
export function daysSince(iso: string | number | null | undefined): number | null {
  if (iso === null || iso === undefined || iso === "") return null;
  const then = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** A tiny deterministic hash, handy for stable React keys and cache keys. */
export function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Drop `undefined` values from a query object so URL builders stay clean. */
export function cleanQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") {
      if (value) out[key] = "true";
      continue;
    }
    out[key] = String(value);
  }
  return out;
}
