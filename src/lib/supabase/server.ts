import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAnonKey, requireSupabaseUrl } from "@/lib/env";

/**
 * Server component / route handler client.
 *
 * Next.js 16 hands back an async cookie jar, so `cookies()` is awaited and we
 * use the `getAll` / `setAll` pairing `@supabase/ssr` expects. `setAll` can
 * throw when called from a Server Component (cookies are immutable there); the
 * middleware already refreshes the session, so swallowing it is correct.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Read-only cookie context — session refresh happens in middleware.
        }
      },
    },
  });
}

/** Convenience helper: the signed-in profile, or `null`. */
export async function getCurrentProfile(): Promise<{
  id: string;
  email: string | null;
  githubUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("github_username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ github_username: string | null; display_name: string | null; avatar_url: string | null }>();

  return {
    id: user.id,
    email: user.email ?? null,
    githubUsername: profile?.github_username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
