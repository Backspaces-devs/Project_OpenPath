import Link from "next/link";
import { ArrowRight, Sparkles, GitPullRequest, Users, Trophy } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-5xl mx-auto px-4 py-24 sm:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 mb-6 text-xs text-white/70">
          <Sparkles className="size-3 text-[#18CCFC]" />
          <span>Live-data open-source discovery for engineering students</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mb-6">
          Find a repo. Pick an issue. <br className="hidden sm:inline" />
          <span className="text-white/90">Get merged.</span>
        </h1>

        <p className="text-base sm:text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">
          OpenPath ranks repositories by maintainer response times, newcomer merge rates, and onboarding clarity. 
          Stop guessing which projects welcome beginners.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/discover"
            className="rounded-full px-6 py-2.5 text-xs uppercase tracking-widest font-bold text-neutral-200 shadow-[inset_0_0_0_2px_#616467] hover:bg-[#616467] hover:text-white transition duration-200 flex items-center gap-2"
          >
            <span>Explore Repos</span>
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="https://github.com"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Sign in with GitHub
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-white/[0.08]">
        <div className="text-left mb-12">
          <span className="text-[11px] uppercase tracking-wider text-white/40 block mb-1">
            Engineered for contributors
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Beyond GitHub stars
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Stars tell you what is popular. The Vibe Score tells you where you can actually contribute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-3">
            <div className="size-9 rounded-lg bg-[#18CCFC]/10 flex items-center justify-center text-[#18CCFC]">
              <Sparkles className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-white">The Vibe Score</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              We compute five live signals for every repo: maintainer response speed, first-timer PR merge rate, onboarding quality, commit frequency, and active good first issues.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-3">
            <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <GitPullRequest className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-white">6 Discovery Algorithms</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Switch between Highest Vibe, Beginner Friendly, Most Active, Rising Stars, and Hidden Gems (high vibe repos with under 5,000 stars).
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-3">
            <div className="size-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Trophy className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Quests & Verified XP</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Track your contribution journey with 12 structured quests. XP is awarded through verified GitHub webhooks as your pull requests are merged.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
