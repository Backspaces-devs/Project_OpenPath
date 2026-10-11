import Link from "next/link";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/issues", label: "Issues" },
  { href: "/settings", label: "Status" },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col bg-black">
      {/* Floating pill navbar — the only pure-black surface in the product. */}
      <header className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
        <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#333] bg-[#1f1f1f57] p-1.5 pr-2 backdrop-blur-sm">
          <Link
            href="/"
            className="flex items-baseline gap-1.5 rounded-full py-1.5 pr-3 pl-3 text-sm font-semibold tracking-tight text-white/90 transition-colors duration-200 hover:text-white"
          >
            OpenPath
            <span className="text-[10px] font-normal text-white/40">by Backspaces</span>
          </Link>

          <span aria-hidden className="mx-1 h-4 w-px bg-white/10" />

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-xs text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/discover"
            className={cn(
              "ml-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors duration-200 hover:bg-white/90",
            )}
          >
            Open app
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-white/30 sm:flex-row">
          <p>
            OpenPath is a{" "}
            <a
              href="https://backspaces-one.vercel.app"
              target="_blank"
              rel="noreferrer noopener"
              className="text-white/50 underline-offset-4 transition-colors duration-200 hover:text-white/80 hover:underline"
            >
              Backspaces
            </a>{" "}
            product.
          </p>
          <p>© 2026 Backspaces. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
