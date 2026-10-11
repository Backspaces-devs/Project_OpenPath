import { SavedList } from "@/components/account/saved-list";
import { Suspense } from "react";

export const metadata = { title: "Saved · OpenPath" };

// Every page under the app shell is request-driven (searchParams, live GitHub
// data), so it is allowed to block navigation rather than pretend to be instant.
export const instant = false;


export default function SavedPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">Saved</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white/90">
          Saved repositories
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">
          Bookmarked with the flag on any repository card. Each entry is re-fetched live from GitHub
          every time you open this page, so the numbers are current, not a snapshot.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-white/40">Loading saved repositories…</p>}>
        <SavedList />
      </Suspense>
    </div>
  );
}
