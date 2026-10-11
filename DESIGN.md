# OpenPath design system

Derived from the Backspaces app. These rules override any other design guidance, including
Tailwind's defaults and component-library conventions.

## Tokens

| Token | Value | Notes |
| --- | --- | --- |
| `--background` | `oklch(0.145 0 0)` ≈ `#0a0a0a` | The only app background |
| `--foreground` | `oklch(0.985 0 0)` | |
| `--brand` | `#18CCFC` | Backspaces cyan — the single accent |
| `--radius` | `0.75rem` | Cards `2xl` = 20px, tiles `xl` = 16px |
| Fonts | Geist (UI), Geist Mono (numbers, code) | Self-hosted via the `geist` package |

## Rules

**Theme.** Dark only. The `dark` class is always present on `<html>`; there is no toggle.

**Background.** `bg-background` everywhere in the app. Pure `#000` appears only on the marketing
page — it is what makes the landing feel different from the product.

**Surfaces.** White at low opacity, never grey. Cards `bg-white/5`, tiles and insets
`bg-white/[0.03]`, hover on cards `bg-white/[0.07]`.

**Borders.** `border-white/10` on cards and bars. `border-white/[0.08]` for inner dividers and
`border-white/[0.06]` for chips.

**Text.** One opacity ladder, no colour:

| Role | Class |
| --- | --- |
| Heading | `text-white/90` |
| Body | `text-white/70` |
| Secondary | `text-white/50` |
| Meta | `text-white/40` |
| Placeholder | `text-white/30` |

**Accent.** `#18CCFC` for charts, links, progress and the saved-state icon. Never as a fill, never on
text that is already a link target.

**Buttons.** Primary is `bg-white text-black`, never coloured. Secondary is
`border border-white/10 bg-white/5 text-white/70`. Both `rounded-full`, both
`transition-colors duration-200`.

**Status pills.** Muted tints — a low-opacity background, a slightly stronger border, and a text
colour one step brighter. Never a saturated fill.

| State | Classes |
| --- | --- |
| Positive | `bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400/90` |
| Warning | `bg-amber-500/[0.08] border-amber-500/20 text-amber-400/90` |
| Info | `bg-sky-500/[0.08] border-sky-500/20 text-sky-400/90` |
| Neutral | `bg-white/[0.06] border-white/[0.10] text-white/50` |

**Type scale.** Eyebrows are `font-mono text-[11px] uppercase tracking-[0.2em] text-white/30`. Page
titles are `text-2xl font-semibold tracking-tight`. Card titles are `text-[15px] font-semibold`.
Every number, count, date and repository slug is `font-mono`.

**Radius.** Cards `rounded-2xl`, tiles `rounded-xl`, icon buttons `rounded-lg`, inputs `rounded-md`,
chips `rounded-full`.

**Shadows.** None on cards. Only dialogs and drawers get `shadow-2xl`.

**Motion.** `transition-colors duration-200`. No bounce, no spring, no scale transforms. The single
exception is a `translate-x-0.5` nudge on a hovered arrow.

**Icons.** `lucide-react` only. Monochrome, inheriting `currentColor`, sized `size-3` to `size-5`.

## Shell

- **Sidebar** — `lg:w-[15%]` with a `236px` floor. A glass panel
  (`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl`) inset with `p-3`. Header holds
  the wordmark plus the arrow back to backspaces-one.vercel.app; footer holds the avatar and
  Settings.
- **Top bar** — `h-14`, sticky, glass, `border-b border-white/[0.08]`. On mobile it carries the
  hamburger; on desktop a breadcrumb.
- **Mobile drawer** — left sheet over a `bg-black/60` overlay, `shadow-2xl`, closed by Escape,
  backdrop click or navigation.

## Components

| Component | Recipe |
| --- | --- |
| `repo-card` | `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5`, `hover:bg-white/[0.07]` |
| `vibe-badge` | Rounded pill, band tint by score, number in `font-mono`, dot when confidence < 0.5 |
| `search-bar` | `rounded-full bg-white/5 border border-white/10`, `Search` icon `size-4 text-white/30` |
| `strategy-toggle` | `bg-white/5 border border-white/10 rounded-full p-1`; active `bg-white/15 text-white`, inactive `text-white/50 hover:text-white` |
| `skeleton-card` | `animate-pulse rounded-xl bg-white/[0.06]` |
| `empty-state` | Icon in a `size-14 rounded-full border border-white/10 bg-white/[0.04]` circle, title `text-sm font-semibold`, body `text-sm text-muted-foreground` |
