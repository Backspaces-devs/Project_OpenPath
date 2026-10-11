import { z } from "zod";

/** The six ways OpenPath can rank the same corpus. */
export const DISCOVERY_STRATEGIES = [
  "vibe",
  "beginner",
  "active",
  "rising",
  "hidden_gems",
  "personalized",
] as const;

export type DiscoveryStrategy = (typeof DISCOVERY_STRATEGIES)[number];

export const PUSH_WINDOWS = ["", "7", "30", "90", "180", "365"] as const;
export type PushWindow = (typeof PUSH_WINDOWS)[number];

export const PAGE_SIZES = [12, 24, 48] as const;

export const DISCOVERY_DEFAULTS = {
  q: "",
  strategy: "vibe" as DiscoveryStrategy,
  language: "",
  topic: "",
  minStars: 0,
  minVibe: 0,
  goodFirstIssuesOnly: false,
  pushedWithin: "" as PushWindow,
  page: 1,
  perPage: 24,
};

/* ------------------------------------------------------------------ */
/*  Query parsing                                                      */
/* ------------------------------------------------------------------ */

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const bool = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0", "yes", "no", "on", "off"])])
  .catch(false)
  .transform((value) =>
    value === true || value === "true" || value === "1" || value === "yes" || value === "on",
  );

const boundedInt = (fallback: number, min: number, max: number) =>
  z.coerce.number().catch(fallback).transform((value) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  });

export const DiscoveryQuerySchema = z.object({
  q: z.string().catch("").transform((value) => value.trim().slice(0, 200)),
  strategy: z.enum(DISCOVERY_STRATEGIES).catch("vibe"),
  language: z.string().catch("").transform((value) => value.trim().slice(0, 40)),
  topic: z.string().catch("").transform((value) => value.trim().slice(0, 60)),
  minStars: boundedInt(0, 0, 1_000_000),
  minVibe: boundedInt(0, 0, 100),
  goodFirstIssuesOnly: bool,
  pushedWithin: z
    .string()
    .catch("")
    .transform((value) => (PUSH_WINDOWS.includes(value as PushWindow) ? (value as PushWindow) : "")),
  page: boundedInt(1, 1, 1_000),
  perPage: boundedInt(24, 12, 48),
});

export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

/**
 * Parse `searchParams` into a fully-populated query. Every field has a `.catch()`
 * fallback, so a hand-edited URL can never throw — it just lands on defaults.
 */
export function parseDiscoveryQuery(params: RawParams): DiscoveryQuery {
  return DiscoveryQuerySchema.parse({
    q: first(params.q),
    strategy: first(params.strategy),
    language: first(params.language),
    topic: first(params.topic),
    minStars: first(params.minStars),
    minVibe: first(params.minVibe),
    goodFirstIssuesOnly: first(params.gfi),
    pushedWithin: first(params.pushed),
    page: first(params.page),
    perPage: first(params.perPage),
  });
}

/** Build a querystring for links, dropping anything still at its default. */
export function discoveryToSearchParams(query: DiscoveryQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.strategy !== DISCOVERY_DEFAULTS.strategy) params.set("strategy", query.strategy);
  if (query.language) params.set("language", query.language);
  if (query.topic) params.set("topic", query.topic);
  if (query.minStars > 0) params.set("minStars", String(query.minStars));
  if (query.minVibe > 0) params.set("minVibe", String(query.minVibe));
  if (query.goodFirstIssuesOnly) params.set("gfi", "true");
  if (query.pushedWithin) params.set("pushed", query.pushedWithin);
  if (query.perPage !== DISCOVERY_DEFAULTS.perPage) params.set("perPage", String(query.perPage));
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function withDiscoveryParams(
  pathname: string,
  query: DiscoveryQuery,
  patch: Partial<DiscoveryQuery>,
): string {
  const next = { ...query, ...patch };
  // Any filter change invalidates the current page offset.
  if (!("page" in patch)) next.page = 1;
  const params = discoveryToSearchParams(next);
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

/* ------------------------------------------------------------------ */
/*  Results                                                            */
/* ------------------------------------------------------------------ */

export const IssueQuerySchema = z.object({
  q: z.string().catch("").transform((value) => value.trim().slice(0, 200)),
  language: z.string().catch("").transform((value) => value.trim().slice(0, 40)),
  labels: z.string().catch("good first issue").transform((value) => value.trim().slice(0, 80)),
  page: boundedInt(1, 1, 50),
  perPage: boundedInt(24, 12, 48),
});

export type IssueQuery = z.infer<typeof IssueQuerySchema>;

export function parseIssueQuery(params: RawParams): IssueQuery {
  return IssueQuerySchema.parse({
    q: first(params.q),
    language: first(params.language),
    labels: first(params.labels),
    page: first(params.page),
    perPage: first(params.perPage),
  });
}

export function issueToSearchParams(query: IssueQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.language) params.set("language", query.language);
  if (query.labels) params.set("labels", query.labels);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.perPage !== 24) params.set("perPage", String(query.perPage));
  return params;
}
