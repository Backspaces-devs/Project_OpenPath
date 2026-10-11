"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bell, Settings, ArrowLeft, Compass, CircleDot, GitPullRequest, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Issues", href: "/issues", icon: CircleDot },
  { label: "My PRs", href: "/prs", icon: GitPullRequest },
  { label: "Saved", href: "/saved", icon: Bookmark },
];

const glass = "bg-white/5 backdrop-blur-md border border-white/10";
const navItem =
  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = NAV.find((n) => pathname.startsWith(n.href))?.label ?? "OpenPath";

  const links = (onClick?: () => void) =>
    NAV.map(({ label, href, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={onClick}
        className={cn(navItem, pathname.startsWith(href) && "bg-white/10 text-foreground")}
      >
        <Icon className="size-5" />
        {label}
      </Link>
    ));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className={cn("hidden lg:flex lg:w-[15%] lg:min-w-[220px] flex-col h-full shrink-0 border-r", glass)}>
        <div className="h-14 flex items-center gap-2 px-5 border-b border-white/10">
          <Link href="https://backspaces-one.vercel.app" aria-label="Back to Backspaces">
            <ArrowLeft className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-semibold text-lg tracking-tight">OpenPath</span>
            <span className="text-[11px] text-white/40 truncate">by Backspaces</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">{links()}</nav>
        <div className="min-h-[64px] flex items-center justify-between px-4 border-t border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-full border border-white/10 bg-white/10 shrink-0" />
            <span className="text-sm font-medium truncate">Guest Contributor</span>
          </div>
          <Link href="/settings" aria-label="Settings">
            <Settings className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className={cn("absolute left-0 top-0 h-full w-[75%] max-w-xs flex flex-col", glass)}>
            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10">
              <span className="font-semibold text-lg tracking-tight">OpenPath</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {links(() => setOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className={cn("h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10", glass)}>
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <h2 className="flex-1 px-2 text-sm sm:text-base font-semibold">{title}</h2>
          <button
            aria-label="Notifications"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
