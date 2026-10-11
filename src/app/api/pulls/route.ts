import { NextResponse, type NextRequest } from "next/server";

import { getUserPullRequests } from "@/lib/data/issues";

/**
 * Open pull requests for a GitHub login.
 *
 * GET /api/pulls?user=octocat
 */
export async function GET(request: NextRequest) {
  const user = (request.nextUrl.searchParams.get("user") ?? "").trim();

  if (!user) {
    return NextResponse.json({ error: "Pass ?user=<github login>" }, { status: 400 });
  }

  try {
    const { items, totalCount } = await getUserPullRequests(user, { perPage: 50 });
    return NextResponse.json({ items, totalCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /rate limit/i.test(message) ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
