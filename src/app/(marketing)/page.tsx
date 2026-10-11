import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { discoverIssues } from "@/lib/data/issues";
import { formatNumber } from "@/lib/utils";

export const metadata = {
  title: "OpenPath · Backspaces",
  description:
    "Live GitHub signal on which open source projects are actually worth contributing to — scored, not guessed.",
};

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden px-6 pt-40 pb-24 sm:pt-48 sm:pb-32">
        {/* Hairline grid + a single, very restrained cyan bloom. */}
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_72%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-14rem] left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[120px]"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="font-mono text-[11px] tracking-[0.28em] text-white/30 uppercase">
            OpenPath · Backspaces
          </p>

          <h1 className="mt-6 text-balance text-4xl leading-[1.08] font-semibold tracking-tight text-white/90 sm:text-6xl">
            Find the open source project worth your next weekend.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
            Every number here comes straight from the GitHub API. We score each repository on how
            alive it is, how quickly maintainers respond, and how easy it is to land a first
            contribution.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-widest text-neutral-200 uppercase shadow-[inset_0_0_0_2px_#616467] transition-colors duration-200 hover:bg-white/[0.06]"
            >
              Start discovering
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            <Suspense fallback={<LiveCountFallback />}>
              <LiveCount />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-12 sm:grid-cols-3 sm:gap-8">
          {[
            {
              step: "01",
              title: "Live, not scraped",
              body: "Search runs against GitHub's own index on every request. Nothing is cached into a stale snapshot.",
            },
            {
              step: "02",
              title: "Scored on five axes",
              body: "Activity, community, responsiveness, beginner friendliness and clarity — weighted, and honest about what is missing.",
            },
            {
              step: "03",
              title: "Built for a first PR",
              body: "Filters that surface repos with open good first issues, a contributing guide and maintainers who actually reply.",
            },
          ].map((item) => (
            <div key={item.step}>
              <p className="font-mono text-[11px] text-white/25">{item.step}</p>
              <h2 className="mt-3 text-sm font-semibold text-white/80">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * One real number, pulled live, so the hero never makes a claim it cannot back.
 * The fetch is separated from the render so failures are handled as data, not
 * by wrapping JSX in a try/catch.
 */
async function fetchOpenGoodFirstIssues(): Promise<number | null> {
  // Fetched live, so it must not be baked into the build.
  await connection();
  try {
    const { totalCount } = await discoverIssues({
      q: "",
      language: "",
      labels: "good first issue",
      page: 1,
      perPage: 1,
    });
    return totalCount > 0 ? totalCount : null;
  } catch {
    return null;
  }
}

async function LiveCount() {
  const totalCount = await fetchOpenGoodFirstIssues();
  if (!totalCount) return <LiveCountFallback />;

  return (
    <p className="font-mono text-[11px] text-white/30">
      {formatNumber(totalCount)} open good first issues on GitHub right now
    </p>
  );
}

function LiveCountFallback() {
  return <p className="font-mono text-[11px] text-white/25">Live GitHub data · no seed required</p>;
}
