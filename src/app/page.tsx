import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  GitPullRequest,
  Clock,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { MOCK_REPOSITORIES } from "@/lib/data/mock-data";
import { RepoCard } from "@/components/repo/repo-card";

export default function HomePage() {
  const topRepos = MOCK_REPOSITORIES.slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight">OpenPath</span>
            <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
              by Backspaces
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/discover"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Discover
          </Link>
          <Link
            href="/issues"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Good First Issues
          </Link>
          <Link
            href="/prs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            My PRs & Quests
          </Link>
          <Link
            href="/discover"
            className="px-4 py-2 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-lg shadow-white/5"
          >
            Open App
            <ArrowRight className="size-4" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Subtle Glow Backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 size-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>Never waste another pull request shouting into the void</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
            Find open-source repos you can{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              actually get merged.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop waiting months for dormant maintainers. OpenPath scores repositories by review
            latency, newcomer merge rates, and onboarding clarity so your first contribution gets
            celebrated.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/discover"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <Compass className="size-4" />
              Explore High-Vibe Repos
            </Link>
            <Link
              href="/issues"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/10 hover:bg-white/[0.05] font-semibold text-sm text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <GitPullRequest className="size-4 text-emerald-400" />
              Browse Fresh Good First Issues
            </Link>
          </div>

          {/* Popular Language Quick Chips */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Popular stacks:</span>
            {["TypeScript", "Python", "Rust", "Go", "React"].map((lang) => (
              <Link
                key={lang}
                href={`/discover?language=${lang}`}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:text-foreground transition-colors"
              >
                {lang}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="border-y border-white/10 bg-white/[0.02] py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">1,400+</div>
            <div className="text-xs text-muted-foreground mt-1">Verified Repositories</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">86%</div>
            <div className="text-xs text-muted-foreground mt-1">First-Timer PR Merge Rate</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono">~6.4h</div>
            <div className="text-xs text-muted-foreground mt-1">Avg Review Latency</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">4,200+</div>
            <div className="text-xs text-muted-foreground mt-1">Active Good First Issues</div>
          </div>
        </div>
      </section>

      {/* How Vibe Score Works */}
      <section className="py-16 px-6 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">The OpenPath Vibe Algorithm</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Traditional GitHub stars only measure hype. Vibe Score measures whether maintainers will
            respect your time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
            <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="size-5" />
            </div>
            <h3 className="font-semibold text-sm">Maintainer Responsiveness (25%)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analyzes response time on issues and PRs. Sub-24h turnarounds earn full marks; abandoned
              repos get penalised.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GitPullRequest className="size-5" />
            </div>
            <h3 className="font-semibold text-sm">Newcomer Merge Rate (25%)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Checks how many first-time contributors actually had their pull requests accepted and
              shipped to production.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
            <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="font-semibold text-sm">Onboarding Clarity (20%)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Evaluates CONTRIBUTING guidelines, local setup guides, Codespaces support, and code of
              conduct presence.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="size-5" />
            </div>
            <h3 className="font-semibold text-sm">Activity & Freshness (20%)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quantifies 30-day commit frequency and push freshness. No ghost-town repos with
              unresolved dependencies.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5">
            <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Star className="size-5" />
            </div>
            <h3 className="font-semibold text-sm">Beginner Surface (10%)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Penalizes stale, orphaned good-first-issues and rewards maintainers who actively groom
              starter tickets.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">AI Contributor Gameplans</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For every issue, our AI scans the repository structure and generates specific setup
                instructions and target files to inspect.
              </p>
            </div>
            <Link
              href="/discover"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 pt-2"
            >
              Try it now <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Repositories Grid */}
      <section className="py-12 px-6 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Top Vibe Repositories</h2>
            <p className="text-xs text-muted-foreground">Handpicked open-source projects with active maintainers</p>
          </div>
          <Link
            href="/discover"
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 border-t border-white/10 text-center space-y-5 bg-white/[0.01]">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to ship your first open-source PR?</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Jump into our curated discovery feed and start earning contributor XP today.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 shadow-lg"
        >
          Get Started with OpenPath
          <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/10 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto w-full">
        <span>© 2026 OpenPath · Built by Backspaces</span>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <Link href="/discover" className="hover:text-foreground">Discover</Link>
          <Link href="/issues" className="hover:text-foreground">Issues</Link>
          <Link href="/prs" className="hover:text-foreground">Quests</Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
