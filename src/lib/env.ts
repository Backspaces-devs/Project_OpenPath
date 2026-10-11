import { ConfigurationError } from "@/lib/errors";

function read(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/* ------------------------------------------------------------------ */
/*  Supabase                                                           */
/* ------------------------------------------------------------------ */

export function supabaseUrl(): string | undefined {
  return read("NEXT_PUBLIC_SUPABASE_URL") ?? read("SUPABASE_URL");
}

export function supabaseAnonKey(): string | undefined {
  return read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? read("SUPABASE_ANON_KEY");
}

export function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function supabaseServiceRoleKey(): string | undefined {
  return read("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * True when the app has everything it needs to read from Supabase.
 * The whole app is designed to run *without* Supabase by reading live data
 * straight from GitHub, so this is an enhancement, not a requirement.
 */
export function isSupabaseConfigured(): boolean {
  return isValidSupabaseUrl(supabaseUrl()) && Boolean(supabaseAnonKey());
}

export function isSupabaseAdminConfigured(): boolean {
  return isValidSupabaseUrl(supabaseUrl()) && Boolean(supabaseServiceRoleKey());
}

export function requireSupabaseUrl(): string {
  const url = supabaseUrl();
  if (!url) {
    throw new ConfigurationError(
      "Supabase is not configured.",
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  if (!isValidSupabaseUrl(url)) {
    throw new ConfigurationError(
      "Supabase URL is invalid.",
      "NEXT_PUBLIC_SUPABASE_URL must be a complete HTTP or HTTPS URL, such as https://your-project.supabase.co.",
    );
  }
  return url;
}

export function requireSupabaseAnonKey(): string {
  const key = supabaseAnonKey();
  if (!key) {
    throw new ConfigurationError(
      "Supabase is not configured.",
      "Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return key;
}

export function requireServiceRoleKey(): string {
  const key = supabaseServiceRoleKey();
  if (!key) {
    throw new ConfigurationError(
      "SUPABASE_SERVICE_ROLE_KEY is missing.",
      "The service role key bypasses RLS — server-side scripts and webhooks only. Never expose it to the browser.",
    );
  }
  return key;
}

/* ------------------------------------------------------------------ */
/*  GitHub                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tokens come from `GITHUB_TOKEN_POOL` (comma separated) first, then the single
 * `GITHUB_TOKEN`. An empty pool is legal: the client falls back to anonymous
 * requests (60 req/hour) so the app still shows live data.
 */
export function githubTokenPool(): string[] {
  const raw = read("GITHUB_TOKEN_POOL");
  const fromPool = raw
    ? raw
        .split(/[,\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
    : [];
  const single = read("GITHUB_TOKEN");
  const tokens = [...fromPool];
  if (single && !tokens.includes(single)) tokens.push(single);
  // Stable order + dedupe.
  return Array.from(new Set(tokens));
}

export function githubApiBaseUrl(): string {
  return read("GITHUB_API_BASE_URL") ?? "https://api.github.com";
}

export function githubUserAgent(): string {
  return read("GITHUB_USER_AGENT") ?? "OpenPath-by-Backspaces";
}

/* ------------------------------------------------------------------ */
/*  Misc                                                               */
/* ------------------------------------------------------------------ */

export function openAiKey(): string | undefined {
  return read("OPENAI_API_KEY");
}

export function isEmbeddingsConfigured(): boolean {
  return Boolean(openAiKey());
}

export function appUrl(): string {
  return read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
}

export interface EnvStatus {
  name: string;
  present: boolean;
  required: boolean;
  description: string;
}

export function envStatus(): EnvStatus[] {
  return [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      present: isValidSupabaseUrl(supabaseUrl()),
      required: false,
      description: "Project URL. Optional — without it OpenPath reads GitHub live.",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      present: Boolean(supabaseAnonKey()),
      required: false,
      description: "Public anon key, safe in the browser. Read-only against RLS.",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      present: Boolean(supabaseServiceRoleKey()),
      required: false,
      description: "Server-only key that bypasses RLS. Required for seed/sync scripts.",
    },
    {
      name: "GITHUB_TOKEN_POOL",
      present: githubTokenPool().length > 0,
      required: false,
      description:
        "Comma-separated classic or fine-grained PATs used round-robin. Without one you get 60 req/hour.",
    },
    {
      name: "GITHUB_TOKEN",
      present: Boolean(read("GITHUB_TOKEN")),
      required: false,
      description: "Single-token fallback if you do not want a pool.",
    },
    {
      name: "OPENAI_API_KEY",
      present: Boolean(openAiKey()),
      required: false,
      description: "Phase 4 only: embeddings for semantic search.",
    },
    {
      name: "NEXT_PUBLIC_SITE_URL",
      present: Boolean(read("NEXT_PUBLIC_SITE_URL")),
      required: false,
      description: "Canonical origin, used in metadata and callbacks.",
    },
  ];
}
