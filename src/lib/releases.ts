import { site, releasesUrl } from '../config';

/**
 * Release model shared by the build-time pre-render and the client-side refresh.
 * Keep this module free of Node-only APIs so it can be bundled for the browser.
 */

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
  /** Release notes as GitHub-flavoured Markdown. */
  notes: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
}

export const RELEASES_API = `https://api.github.com/repos/${site.github.owner}/${site.github.repo}/releases?per_page=20`;

export const GITHUB_ACCEPT = 'application/vnd.github+json';

/** Converts the raw GitHub API payload into the site's release model (drafts and non-APK assets dropped). */
export function normalizeReleases(data: GitHubRelease[]): Release[] {
  return data
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: r.tag_name,
      name: r.name || r.tag_name,
      url: r.html_url,
      publishedAt: r.published_at,
      notes: r.body ?? '',
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
}

/** The newest stable release that ships an APK, falling back to the newest release of any kind. */
export function pickLatest(releases: Release[]): Release | null {
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
