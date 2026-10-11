import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Builds the href for a given page number. */
  hrefFor: (page: number) => string;
  className?: string;
}

/** Windowed page numbers with first/last always reachable. */
function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set<number>([1, pageCount, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < pageCount) pages.add(page + 1);
  if (page <= 3) [2, 3, 4].forEach((value) => value < pageCount && pages.add(value));
  if (page >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => value > 1 && pages.add(value));
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push("gap");
    out.push(value);
    previous = value;
  }
  return out;
}

export function Pagination({ page, pageCount, hrefFor, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = pageWindow(page, pageCount);

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Pagination">
      <PageLink href={hrefFor(Math.max(1, page - 1))} disabled={page <= 1} ariaLabel="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
      </PageLink>

      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-xs text-white/25">
            …
          </span>
        ) : (
          <PageLink
            key={item}
            href={hrefFor(item)}
            active={item === page}
            ariaLabel={`Page ${item}`}
          >
            {item}
          </PageLink>
        ),
      )}

      <PageLink
        href={hrefFor(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        ariaLabel="Next page"
      >
        <ChevronRight className="size-4" aria-hidden />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex size-8 items-center justify-center rounded-lg text-white/20"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-xs transition-colors duration-200",
        active
          ? "bg-white/15 text-white"
          : "text-white/50 hover:bg-white/[0.07] hover:text-white/90",
      )}
    >
      {children}
    </Link>
  );
}
