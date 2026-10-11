import Link from "next/link";
import { GitBranch } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col selection:bg-white/20 selection:text-white">
      {/* Floating Pill Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-4xl rounded-full border border-[#333] bg-[#1f1f1f57] backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all">
        <Link href="/" className="flex items-center gap-2">
          <GitBranch className="size-5 text-white" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-base tracking-tight text-white">
              OpenPath
            </span>
            <span className="text-[11px] text-white/40 hidden sm:inline">
              by Backspaces
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/discover" className="text-sm text-gray-300 hover:text-white transition-colors">
            Discover
          </Link>
          <Link href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">
            Vibe Score
          </Link>
          <Link href="#campus" className="text-sm text-gray-300 hover:text-white transition-colors">
            Campus
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/discover"
            className="rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-3.5 py-1.5 text-xs text-gray-300 hover:border-white/50 hover:text-white transition-colors duration-200"
          >
            Log in
          </Link>
          <Link
            href="/discover"
            className="rounded-full bg-white text-black font-semibold px-4 py-1.5 text-xs hover:bg-white/90 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-24">{children}</main>

      {/* Footer */}
      <footer className="w-full bg-[#0a0a0a] border-t border-white/[0.06] mt-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[18px] font-semibold text-white">OpenPath</span>
                <span className="text-xs text-white/40">by Backspaces</span>
              </div>
              <p className="text-[13px] text-white/50 max-w-sm leading-relaxed">
                A live-data open-source discovery and collaboration platform for engineering students.
                Find real repos, pick good first issues, and get merged.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Discovery</h4>
              <ul className="space-y-2.5 text-[13px] text-white/50">
                <li><Link href="/discover" className="hover:text-white transition-colors">Top Vibe Repos</Link></li>
                <li><Link href="/discover?strategy=beginner" className="hover:text-white transition-colors">Good First Issues</Link></li>
                <li><Link href="/discover?strategy=hidden_gems" className="hover:text-white transition-colors">Hidden Gems</Link></li>
                <li><Link href="/discover?strategy=rising" className="hover:text-white transition-colors">Rising Stars</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Ecosystem</h4>
              <ul className="space-y-2.5 text-[13px] text-white/50">
                <li><Link href="https://backspaces-one.vercel.app" target="_blank" className="hover:text-white transition-colors">Backspaces App</Link></li>
                <li><Link href="/quests" className="hover:text-white transition-colors">Skill Tree & Quests</Link></li>
                <li><Link href="/projects" className="hover:text-white transition-colors">Campus Gigs</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <p>OpenPath is a Backspaces product</p>
            <p>&copy; 2026 Backspaces. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
