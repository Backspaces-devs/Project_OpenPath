import { Search } from "lucide-react";
import { Suspense } from "react";

import { MyPullRequests } from "@/components/account/my-pull-requests";

export const metadata = { title: "My PRs · OpenPath" };

// Every page under the app shell is request-driven (searchParams, live GitHub
// data), so it is allowed to block navigation rather than pretend to be instant.
export const instant = false;


export default function MyPullRequestsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">My PRs</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white/90">
          Your open pull requests
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
          Enter a GitHub login and OpenPath pulls that account&apos;s open pull requests live from the
          GitHub search API. Nothing is stored anywhere.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Search className="size-4 animate-pulse" aria-hidden />
            Loading…
          </div>
        }
      >
        <MyPullRequests />
      </Suspense>
    </div>
  );
}
