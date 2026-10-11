import { NextResponse, type NextRequest } from "next/server";

import { getRepository } from "@/lib/github/fetchers";
import { repoFromGitHub } from "@/lib/data/mappers";
import { toAppError } from "@/lib/errors";
import type { RepoCardData } from "@/lib/data/types";
import { chunk } from "@/lib/utils";

/**
 * Batch repository lookup for the Saved page.
 *
 * GET /api/repos?full_name=vercel/next.js&full_name=facebook/react
 *
 * Runs through the same ETag-cached GitHub client as the server components, so
 * repeat visits are mostly 304s and cost nothing against the rate limit.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.getAll("full_name");
  const slugs = requested
    .map((value) => value.trim())
    .filter((value) => /^[^/]+\/[^/]+$/.test(value))
    .slice(0, 24);

  if (slugs.length === 0) {
    return NextResponse.json({ repos: [], missing: [] });
  }

  const missing: string[] = [];
  const repos: RepoCardData[] = [];

  for (const batch of chunk(slugs, 6)) {
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const [owner, name] = slug.split("/");
        return repoFromGitHub(await getRepository(owner, name));
      }),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        repos.push(result.value);
      } else {
        missing.push(batch[index]);
      }
    });
  }

  const failed = repos.length === 0 && missing.length > 0;

  return NextResponse.json(
    {
      repos,
      missing,
      error: failed ? toAppError(new Error("lookup failed")).message : undefined,
    },
    { status: 200 },
  );
}
