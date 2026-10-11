"use client";

import { Bookmark } from "lucide-react";

import { toggleSaved, useSavedRepos } from "@/lib/saved";
import { cn } from "@/lib/utils";

export interface SaveButtonProps {
  fullName: string;
  className?: string;
}

export function SaveButton({ fullName, className }: SaveButtonProps) {
  const saved = useSavedRepos();
  const active = saved.includes(fullName);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${fullName} from saved` : `Save ${fullName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(fullName);
      }}
      className={cn(
        "rounded-lg p-1.5 transition-colors duration-200",
        active ? "text-brand" : "text-white/30 hover:bg-white/10 hover:text-white/70",
        className,
      )}
    >
      <Bookmark className={cn("size-3.5", active && "fill-current")} aria-hidden />
      <span className="sr-only">{active ? "Saved" : "Save"}</span>
    </button>
  );
}
