import { marked } from 'marked';
import { site, releasesUrl } from '../config';

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  downloads: number;
}

export interface Release {
  tag: string;
  name: string;
  url: string;
  publishedAt: string;
  /** Release notes rendered from Markdown to HTML. */
  bodyHtml: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
}

const API = `https://api.github.com/repos/${site.github.owner}/${site.github.repo}/releases?per_page=20`;

let cache: Release[] | null = null;

/**
 * Fetches releases from GitHub at build time. Returns an empty list when the
 * API is unreachable or rate-limited so the build never fails on network issues.
 */
export async function getReleases(): Promise<Release[]> {
  if (cache) return cache;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'vibestudio-ide-website',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(API, { headers });
    if (!res.ok) {
      console.warn(`[releases] GitHub API returned ${res.status}; download list will be empty.`);
      cache = [];
      return cache;
    }
    const data = (await res.json()) as GitHubRelease[];
    cache = data
      .filter((r) => !r.draft)
      .map((r) => ({
        tag: r.tag_name,
        name: r.name || r.tag_name,
        url: r.html_url,
        publishedAt: r.published_at,
        bodyHtml: r.body ? (marked.parse(r.body, { async: false }) as string) : '',
        prerelease: r.prerelease,
        assets: r.assets
          .filter((a) => a.name.endsWith('.apk'))
          .map((a) => ({
            name: a.name,
            url: a.browser_download_url,
            size: a.size,
            downloads: a.download_count,
          })),
      }));
  } catch (err) {
    console.warn(`[releases] Failed to reach GitHub API: ${(err as Error).message}`);
    cache = [];
  }
  return cache;
}

export async function getLatestRelease(): Promise<Release | null> {
  const releases = await getReleases();
  return releases.find((r) => !r.prerelease && r.assets.length > 0) ?? releases[0] ?? null;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export { releasesUrl };
