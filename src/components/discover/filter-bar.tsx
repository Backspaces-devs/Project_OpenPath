import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { AutoSubmit } from "@/components/discover/auto-submit";
import { cn } from "@/lib/utils";
import type { DiscoveryQuery } from "@/lib/discovery/types";

export const DISCOVERY_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Elixir",
  "Zig",
  "Lua",
  "HTML",
  "CSS",
  "Shell",
  "Jupyter Notebook",
] as const;

const FORM_ID = "discovery-filters";

export interface FilterBarProps {
  query: DiscoveryQuery;
  action?: string;
  className?: string;
}

export function FilterBar({ query, action = "/discover", className }: FilterBarProps) {
  const hasFilters =
    Boolean(query.language) ||
    Boolean(query.topic) ||
    query.minStars > 0 ||
    query.minVibe > 0 ||
    query.goodFirstIssuesOnly ||
    Boolean(query.pushedWithin);

  return (
    <form
      id={FORM_ID}
      method="GET"
      action={action}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2",
        className,
      )}
    >
      {/* Preserved across submissions. `page` is intentionally absent. */}
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.strategy !== "vibe" ? <input type="hidden" name="strategy" value={query.strategy} /> : null}
      {query.perPage !== 24 ? <input type="hidden" name="perPage" value={String(query.perPage)} /> : null}

      <Select name="language" label="Language" value={query.language}>
        <option value="">All languages</option>
        {DISCOVERY_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </Select>

      <div className="relative">
        <input
          type="text"
          name="topic"
          defaultValue={query.topic}
          placeholder="Topic"
          aria-label="Topic"
          className={cn(
            "h-9 w-32 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/80 placeholder:text-white/30",
            "transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:outline-none",
          )}
        />
      </div>

      <Select name="minStars" label="Stars" value={query.minStars > 0 ? String(query.minStars) : ""}>
        <option value="">Any stars</option>
        <option value="10">10+ stars</option>
        <option value="100">100+ stars</option>
        <option value="500">500+ stars</option>
        <option value="1000">1k+ stars</option>
        <option value="5000">5k+ stars</option>
      </Select>

      <Select name="pushed" label="Pushed" value={query.pushedWithin}>
        <option value="">Any time</option>
        <option value="7">Past week</option>
        <option value="30">Past month</option>
        <option value="90">Past 3 months</option>
        <option value="180">Past 6 months</option>
        <option value="365">Past year</option>
      </Select>

      <Select name="minVibe" label="Vibe" value={query.minVibe > 0 ? String(query.minVibe) : ""}>
        <option value="">Any vibe</option>
        <option value="60">Vibe 60+</option>
        <option value="75">Vibe 75+</option>
        <option value="90">Vibe 90+</option>
      </Select>

      <label
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs transition-colors duration-200",
          query.goodFirstIssuesOnly
            ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400/90"
            : "border-white/10 bg-white/5 text-white/50 hover:bg-white/[0.07] hover:text-white/80",
        )}
      >
        <input
          type="checkbox"
          name="gfi"
          value="true"
          defaultChecked={query.goodFirstIssuesOnly}
          className="size-3 accent-emerald-400"
        />
        Good first issues
      </label>

      <button
        type="submit"
        className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90"
      >
        Apply
      </button>

      {hasFilters ? (
        <Link
          href={action}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-white/40 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/80"
        >
          <RotateCcw className="size-3" aria-hidden />
          Reset
        </Link>
      ) : null}

      <AutoSubmit formId={FORM_ID} />
    </form>
  );
}

function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue={value}
        aria-label={label}
        className={cn(
          "h-9 appearance-none rounded-full border border-white/10 bg-white/5 pr-7 pl-3 text-xs text-white/80",
          "transition-colors duration-200 hover:bg-white/[0.07] focus:border-white/20 focus:outline-none",
        )}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 8 5"
        className="pointer-events-none absolute top-1/2 right-3 h-[5px] w-2 -translate-y-1/2 fill-none stroke-white/30"
      >
        <path d="M1 1l3 3 3-3" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
