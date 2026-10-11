# Source-me-up · OpenPath

**OpenPath by Backspaces** — a discovery platform that shows you which open source projects are
actually worth your next contribution, scored instead of guessed.

Every number in this app comes from the **GitHub API at request time**. There is no fixture file, no
seeded JSON, no placeholder data anywhere in the codebase — if GitHub is unreachable, the page says
so instead of inventing a number.

```
npm install
npm run dev        # http://localhost:3000
```

With no environment variables at all the app is fully functional. Everything in `.env.example` is
optional and every service it talks to has a free tier.

---

## What is implemented

| Area | Status |
| --- | --- |
| App shell (glass sidebar, mobile drawer, pill marketing navbar) | ✅ |
| Discover: 6 strategies, live search, composable filters, pagination, sorting | ✅ |
| Repository detail: Vibe Score breakdown, 13-week commit chart, contributors, good first issues | ✅ |
| Issues feed (live GitHub issue search) | ✅ |
| My PRs (live pull requests for any GitHub login) | ✅ |
| Saved (localStorage, or Supabase collections when connected) | ✅ |
| Status page: live env check, GitHub rate limits, Supabase table counts | ✅ |
| 11 SQL migrations, RLS on every table | ✅ |
| Seed / sync / rescore scripts + GitHub Action crons | ✅ |
| Vibe Score engine with unit tests | ✅ |

## Pages

| Route | What it does |
| --- | --- |
| `/` | Marketing landing — black background, floating pill navbar, one live number in the hero |
| `/discover` | Repository discovery. Reads Supabase when it is populated, otherwise the GitHub Search API |
| `/discover/[owner]/[repo]` | Full repository breakdown |
| `/issues` | Open issues, defaulting to `good first issue` |
| `/my-prs` | Open pull requests for any GitHub login |
| `/saved` | Bookmarked repositories, re-fetched live on every visit |
| `/settings` | Connection status, rate limits, personalisation |

---

## Environment variables

Copy the example file and fill in **only what you want**:

```bash
cp .env.example .env.local
```

Open `/settings` in the running app — it tells you exactly which keys are set and what each one
unlocks.

### 1. GitHub — optional, but recommended (free)

```env
GITHUB_TOKEN_POOL=ghp_xxx,yyy    # comma separated, rotated round-robin
GITHUB_TOKEN=ghp_xxx             # single-token fallback
```

**How to get one (free):** github.com → **Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new token**. Tick **`public_repo`** — that is the only scope OpenPath
needs. No other scope, no organisation approval, no cost.

**Why bother:**

| | Anonymous | One PAT |
| --- | --- | --- |
| Core API | 60 requests/hour | 5,000 requests/hour |
| Search API | 10 requests/minute | 30 requests/minute |

Without a token the app still works, but you will hit the ceiling after a few page loads and the UI
will tell you so rather than failing silently. Add several tokens and OpenPath rotates automatically
when one runs dry.

### 2. Supabase — optional (free tier)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...     # server only, never NEXT_PUBLIC_
```

**How to get them (free):** supabase.com → **New project** (free tier is enough) → **Project
Settings → API**. You will see all three values there.

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → makes `/discover` read from the
  `repositories` table instead of calling the GitHub Search API on every request.
- `SUPABASE_SERVICE_ROLE_KEY` → required by the three scripts below. It bypasses row level security,
  so it is used **only** in `scripts/` and in the GitHub Actions workflows. It is never bundled for
  the browser.

**This is the important bit:** Supabase is an enhancement, not a requirement. If the table is empty
or the project is unreachable, OpenPath falls back to live GitHub data and says so on the page.

### 3. Phase 4 only

```env
OPENAI_API_KEY=sk-...    # embeddings for semantic search — nothing in Phases 1–3 uses it
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Database setup (only if you use Supabase)

Apply the migrations with the Supabase CLI (no local Docker needed):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or open each file in `supabase/migrations/` and run it in the **SQL Editor** — they are plain SQL and
idempotent (`create table if not exists`, `drop policy if exists`).

Then populate it:

```bash
npm run db:seed    # ~800–1,500 real repos: 12 languages × 4 facets × 3 star buckets
npm run db:sync    # full metrics + Vibe Scores, batches of 25, resumable
npm run db:vibe    # recompute scores from stored metrics — no API calls
```

Useful flags:

```bash
npm run db:seed -- --target=1500 --languages="Rust,Go" --dry-run
npm run db:sync -- --limit=200 --concurrency=8 --refresh
npm run db:vibe -- --only-missing --dry-run
```

`.github/workflows/*.yml` runs seed daily and sync every six hours from Actions secrets
(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GH_TOKEN_POOL`).

---

## Vibe Score

`src/lib/scoring/vibe-score.ts` is a pure function: five weighted components, each built from
signals normalised to 0–100.

| Component | Weight | Signals |
| --- | --- | --- |
| Activity | 30% | freshness of the last push, commits in the last 90 days |
| Community | 20% | stars, contributors, watchers |
| Responsiveness | 20% | issue close rate, median close time, PR merge rate |
| Beginner friendliness | 15% | good first issues, help wanted, contributing guide, code of conduct |
| Clarity | 15% | description, topics, homepage, licence |

Two rules make it honest rather than decorative:

1. **Missing signals are dropped, not assumed.** If we have not measured something it contributes
   nothing, and its weight is redistributed across the components we do have.
2. **`confidence` tells you how much was measured.** A repo scored from search-result fields alone
   lands around 0.4; a synced repo with full history is 1.0. The UI shows a dot next to low-confidence
   scores.

```bash
npm test    # 10 unit tests: perfect repo, abandoned repo, partial data, hostile input
```

## GitHub client

`src/lib/github/client.ts` is a fetch-based client with:

- **Token rotation** — round-robin through `GITHUB_TOKEN_POOL`; on `403` + `x-ratelimit-remaining: 0`
  it rotates and retries, and only throws `RateLimitError` once every token is dry.
- **Rate limiting** — a per-process token bucket (search 25/min, core 4,500/hr per token) so we stay
  under the ceiling without reading a 403 first.
- **ETag caching** — conditional requests through the `github_cache` table. A `304` returns the
  stored body and does **not** count against the rate limit, which is what makes the six-hourly sync
  essentially free.
- **Zod validation** — every payload is validated at the boundary.

## Design system

The rules in `DESIGN.md` (Backspaces design system) are non-negotiable and are encoded in
`src/app/globals.css`:

- Dark only — `dark` is always on `<html>`.
- `#0a0a0a` background, never pure black in app pages (black appears only on the marketing page).
- Surfaces are white at low opacity: `bg-white/5` cards, `bg-white/[0.03]` tiles.
- `border-white/10` for cards and bars, `border-white/[0.08]` for inner dividers.
- Text opacity ladder: `/90` heading, `/70` body, `/50` secondary, `/40` meta, `/30` placeholder.
- `#18CCFC` cyan is the only accent, used sparingly for charts, links and progress.
- Primary button is `bg-white text-black`. Never a coloured fill.
- Geist + Geist Mono only. Numbers and stats are always mono.
- No shadows on cards — only dialogs and drawers get `shadow-2xl`.
- `transition-colors duration-200`. No bounce, spring or scale.
- `lucide-react` icons, monochrome, inheriting text colour.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vibe Score unit tests |
| `npm run db:seed` / `db:sync` / `db:vibe` | Supabase data jobs |

## Notes on Next.js 16

- `cacheComponents` + `partialPrefetching` are on. Pages stream: the static shell arrives first, live
  GitHub data fills in behind `<Suspense>`.
- The session-refresh file is `src/proxy.ts` — Next 16 renamed the `middleware` convention to
  `proxy`. It is a no-op when Supabase is not configured.
- Geist is self-hosted through the `geist` package rather than `next/font/google`, so the build never
  depends on `fonts.googleapis.com` being reachable.
