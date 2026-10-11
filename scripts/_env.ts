/**
 * Minimal `.env` loader for the scripts.
 *
 * Node's built-in `--env-file` throws when the file is missing, and this repo
 * ships without a `.env.local`, so we roll our own: read `.env.local` then
 * `.env`, never overriding a variable that is already set (CI/Action secrets
 * win over committed files).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function parse(contents: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const separator = withoutExport.indexOf("=");
    if (separator === -1) continue;

    const key = withoutExport.slice(0, separator).trim();
    let value = withoutExport.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n");

    if (key) entries.push([key, value]);
  }
  return entries;
}

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  for (const file of [".env.local", ".env"]) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    try {
      for (const [key, value] of parse(readFileSync(path, "utf8"))) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    } catch {
      // A broken env file should not stop a script that may not need it.
    }
  }
}

loadEnv();

/* ------------------------------------------------------------------ */
/*  Tiny CLI helpers                                                   */
/* ------------------------------------------------------------------ */

export interface CliFlags {
  /** `--flag` or `--flag=value` */
  [key: string]: string | boolean | undefined;
}

export function parseFlags(argv: string[] = process.argv.slice(2)): CliFlags {
  const flags: CliFlags = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const separator = body.indexOf("=");
    if (separator === -1) {
      flags[body] = true;
    } else {
      flags[body.slice(0, separator)] = body.slice(separator + 1);
    }
  }
  return flags;
}

export function flagString(flags: CliFlags, name: string, fallback: string): string {
  const value = flags[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function flagNumber(flags: CliFlags, name: string, fallback: number): number {
  const value = flags[name];
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function flagBool(flags: CliFlags, name: string): boolean {
  return flags[name] === true || flags[name] === "true";
}

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

export const log = {
  step: (message: string) => console.log(`${COLORS.cyan}▸${COLORS.reset} ${message}`),
  info: (message: string) => console.log(`${COLORS.dim}  ${message}${COLORS.reset}`),
  ok: (message: string) => console.log(`${COLORS.green}✓${COLORS.reset} ${message}`),
  warn: (message: string) => console.log(`${COLORS.yellow}!${COLORS.reset} ${message}`),
  fail: (message: string) => console.log(`${COLORS.red}✗${COLORS.reset} ${message}`),
  title: (message: string) => console.log(`\n${COLORS.bold}${message}${COLORS.reset}`),
};
