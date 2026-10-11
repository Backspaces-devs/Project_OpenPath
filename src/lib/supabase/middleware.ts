import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie on every request and passes the
 * (possibly renewed) cookies back out on the response.
 *
 * When Supabase is not configured this is a no-op — OpenPath runs perfectly
 * well against the live GitHub API alone.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching the user forces @supabase/ssr to refresh an expired token.
  await supabase.auth.getUser();

  return response;
}
