import { AppShell, type ShellUser } from "@/components/shell/AppShell";
import { isSupabaseConfigured } from "@/lib/env";

// The app shell highlights the active route with `usePathname()`, and every page
// under it reads `searchParams`, so this segment is allowed to block navigation.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: ShellUser | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { getCurrentProfile } = await import("@/lib/supabase/server");
      const profile = await getCurrentProfile();
      if (profile) {
        user = {
          email: profile.email,
          displayName: profile.displayName ?? profile.githubUsername,
          avatarUrl: profile.avatarUrl,
        };
      }
    } catch {
      // Supabase is optional. A failing auth lookup must never break the shell.
      user = null;
    }
  }

  return (
    <AppShell user={user} sourceLabel={isSupabaseConfigured() ? "Supabase" : "Live GitHub"}>
      {children}
    </AppShell>
  );
}
