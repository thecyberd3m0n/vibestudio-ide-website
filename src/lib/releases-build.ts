import { GITHUB_ACCEPT, RELEASES_API, normalizeReleases, pickLatest } from './releases';
import type { GitHubRelease, Release } from './releases';

/**
 * Build-time snapshot of the releases, used to pre-render the pages. The browser
 * refreshes this from the GitHub API on load (see src/scripts/releases-client.ts),
 * so the snapshot only has to be good enough for no-JS visitors and crawlers.
 */

let cache: Release[] | null = null;

/** Returns an empty list when the API is unreachable or rate-limited so the build never fails on network issues. */
export async function getReleases(): Promise<Release[]> {
  if (cache) return cache;

  const headers: Record<string, string> = {
    Accept: GITHUB_ACCEPT,
    'User-Agent': 'vibestudio-ide-website',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(RELEASES_API, { headers });
    if (!res.ok) {
      console.warn(`[releases] GitHub API returned ${res.status}; download list will be empty.`);
      cache = [];
      return cache;
    }
    cache = normalizeReleases((await res.json()) as GitHubRelease[]);
  } catch (err) {
    console.warn(`[releases] Failed to reach GitHub API: ${(err as Error).message}`);
    cache = [];
  }
  return cache;
}

export async function getLatestRelease(): Promise<Release | null> {
  return pickLatest(await getReleases());
}
