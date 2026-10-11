"use client";

import {
  ArrowLeft,
  Bookmark,
  Compass,
  GitPullRequestArrow,
  CircleDot,
  Settings,
  UserCircle2,
  X,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/issues", label: "Issues", icon: CircleDot },
  { href: "/my-prs", label: "My PRs", icon: GitPullRequestArrow },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export interface ShellUser {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AppShellProps {
  children: React.ReactNode;
  user?: ShellUser | null;
  /** Shown as a small pill in the top bar: where the numbers come from. */
  sourceLabel?: string;
}

export function AppShell({ children, user = null, sourceLabel }: AppShellProps) {
  const pathname = usePathname();
  // The path is stored alongside `open` so a route change can close the drawer
  // during render — no effect, no ref.
  const [drawer, setDrawer] = useState({ path: pathname, open: false });
  if (drawer.path !== pathname) setDrawer({ path: pathname, open: false });

  const drawerOpen = drawer.open;
  const setDrawerOpen = (open: boolean) => setDrawer((previous) => ({ ...previous, open }));

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-svh bg-background">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="sticky top-0 hidden h-svh w-[15%] min-w-[236px] shrink-0 flex-col p-3 lg:flex">
        <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <SidebarHeader />
          <SidebarNav pathname={pathname} />
          <SidebarFooter user={user} pathname={pathname} />
        </div>
      </aside>

      {/* ---------------- Mobile drawer ---------------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute top-0 left-0 flex h-full w-[78%] max-w-[300px] flex-col border-r border-white/10 bg-[#121212] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-white/40 transition-colors duration-200 hover:bg-white/10 hover:text-white/80"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <SidebarNav pathname={pathname} />
            </div>
            <SidebarFooter user={user} pathname={pathname} />
          </div>
        </div>
      ) : null}

      {/* ---------------- Main column ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b lg:border-none border-white/10 bg-white/0 px-4 backdrop-blur-md sm:px-6 ">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-lg p-2 text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <Breadcrumb pathname={pathname} />

          <div className="ml-auto flex items-center gap-2">
            {sourceLabel ? (
              <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] tracking-wide text-white/40 uppercase md:inline-flex">
                {sourceLabel}
              </span>
            ) : null}
            <Link
              href="/settings"
              className="rounded-lg p-2 text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar pieces                                                     */
/* ------------------------------------------------------------------ */

const SECTION_LABELS: Record<string, string> = {
  "/discover": "Discover",
  "/issues": "Issues",
  "/my-prs": "My PRs",
  "/saved": "Saved",
  "/settings": "Status",
};

/** `OpenPath / Discover / vercel / next.js`, derived from the current route. */
function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return <span className="text-sm font-semibold text-white/90">OpenPath</span>;

  const root = `/${segments[0]}`;
  const label = SECTION_LABELS[root] ?? segments[0];
  const rest = segments.slice(1);

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
      <span className="hidden shrink-0 text-white/30 sm:inline lg:hidden">OpenPath</span>
      <span className="hidden text-white/20 sm:inline lg:hidden" aria-hidden>
        /
      </span>
      <span className="truncate font-medium text-white/70">{label}</span>
      {rest.map((segment) => (
        <span key={segment} className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="text-white/20">
            /
          </span>
          <span className="truncate font-mono text-white/40">{decodeURIComponent(segment)}</span>
        </span>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-semibold tracking-tight text-white/90">OpenPath</span>
      <span className="text-[10px] text-white/30">by Backspaces</span>
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-start justify-between gap-2">
      <Wordmark />
      <a
        href="/"
        rel="noreferrer noopener"
        title="Back to Backspaces"
        aria-label="Back to Backspaces"
        className="rounded-lg p-1.5 text-white/30 transition-colors duration-200 hover:bg-white/10 hover:text-white/80"
      >
        <ArrowLeft className="size-3.5" />
      </a>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="mt-7 flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-200",
              active
                ? "bg-white/10 text-white"
                : "text-white/50 hover:bg-white/[0.06] hover:text-white/90",
            )}
          >
            <item.icon className={cn("size-4", active ? "text-white/80" : "text-white/40")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ user, pathname }: { user: ShellUser | null; pathname: string }) {
  const settingsActive = pathname.startsWith("/settings");
  const initials = (user?.displayName ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="mt-auto flex items-center gap-2 border-t border-white/[0.08] pt-3">
      <Link
        href="/settings"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-white/[0.06]"
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-7 shrink-0 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] font-mono text-[10px] text-white/50">
            {user ? initials : <UserCircle2 className="size-4" aria-hidden />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-white/70">
            {user?.displayName ?? user?.email ?? "Guest"}
          </span>
          <span className="block truncate text-[10px] text-white/30">
            {user ? "Signed in" : "No account needed"}
          </span>
        </span>
      </Link>

      <Link
        href="/settings"
        aria-label="Settings"
        aria-current={settingsActive ? "page" : undefined}
        className={cn(
          "rounded-lg p-2 transition-colors duration-200",
          settingsActive
            ? "bg-white/10 text-white"
            : "text-white/40 hover:bg-white/[0.06] hover:text-white/80",
        )}
      >
        <Settings className="size-4" />
      </Link>
    </div>
  );
}
