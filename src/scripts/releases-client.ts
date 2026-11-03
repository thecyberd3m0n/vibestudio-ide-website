import { GITHUB_ACCEPT, RELEASES_API, formatDate, formatSize, normalizeReleases, pickLatest } from '../lib/releases';
import type { GitHubRelease, Release } from '../lib/releases';

/**
 * Refreshes the pre-rendered release information straight from the GitHub API
 * in the visitor's browser, so a new app release shows up without redeploying
 * the site. Elements opt in through `data-release="…"` attributes; when the API
 * is unreachable (offline, rate-limited) the build-time content stays in place.
 */

const CACHE_KEY = 'vibestudio:releases';
/** Reuse one API response while the visitor navigates between pages. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  releases: Release[];
}

function readCache(): Release[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.releases;
  } catch {
    return null;
  }
}

function writeCache(releases: Release[]): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), releases };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage may be full or disabled; the fetch result is still used for this page.
  }
}

let inflight: Promise<Release[] | null> | null = null;

/** Resolves to the current releases, or `null` when they could not be loaded. Deduplicated per page load. */
export function loadReleases(): Promise<Release[] | null> {
  inflight ??= (async () => {
    const cached = readCache();
    if (cached) return cached;
    try {
      const res = await fetch(RELEASES_API, { headers: { Accept: GITHUB_ACCEPT } });
      if (!res.ok) {
        console.warn(`[releases] GitHub API returned ${res.status}; showing build-time release info.`);
        return null;
      }
      const releases = normalizeReleases((await res.json()) as GitHubRelease[]);
      writeCache(releases);
      return releases;
    } catch (err) {
      console.warn('[releases] Could not reach the GitHub API; showing build-time release info.', err);
      return null;
    }
  })();
  return inflight;
}

function all<T extends Element = HTMLElement>(field: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(`[data-release="${field}"]`));
}

/** Updates every latest-release placeholder on the page (hero badge, download card, …). */
export function applyLatest(latest: Release | null): void {
  const apk = latest?.assets[0];
  const available = Boolean(latest && apk);
  for (const el of all('available')) el.hidden = !available;
  for (const el of all('unavailable')) el.hidden = available;
  if (!latest || !apk) return;

  for (const el of all('tag')) el.textContent = latest.tag;
  for (const el of all('size')) el.textContent = formatSize(apk.size);
  for (const el of all<HTMLTimeElement>('date')) {
    el.textContent = formatDate(latest.publishedAt);
    el.dateTime = latest.publishedAt;
  }
  for (const el of all<HTMLAnchorElement>('apk-url')) el.href = apk.url;
  for (const el of all('apk-name')) el.textContent = apk.name;
}

/** Fills in the latest release notes; split out so only pages that show notes bundle the Markdown renderer. */
export function applyLatestNotes(latest: Release | null, render: (markdown: string) => string): void {
  for (const el of all('notes')) {
    const html = latest ? render(latest.notes) : '';
    el.innerHTML = html;
    el.hidden = !html;
  }
}

/** Rebuilds the "previous releases" list from `<template data-release="history-item|history-asset">`. */
export function applyHistory(
  releases: Release[],
  latest: Release | null,
  render: (markdown: string) => string,
): void {
  const list = document.querySelector<HTMLElement>('[data-release="history"]');
  const empty = document.querySelector<HTMLElement>('[data-release="history-empty"]');
  const itemTpl = document.querySelector<HTMLTemplateElement>('template[data-release="history-item"]');
  const assetTpl = document.querySelector<HTMLTemplateElement>('template[data-release="history-asset"]');
  if (!list || !empty || !itemTpl || !assetTpl) return;

  const older = releases.filter((r) => r.tag !== latest?.tag);
  const items = older.map((r) => {
    const item = itemTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
    const field = <T extends Element = HTMLElement>(name: string) => item.querySelector<T>(`[data-field="${name}"]`)!;

    const link = field<HTMLAnchorElement>('link');
    link.href = r.url;
    link.textContent = r.tag;
    field('prerelease').hidden = !r.prerelease;

    const date = field<HTMLTimeElement>('date');
    date.dateTime = r.publishedAt;
    date.textContent = formatDate(r.publishedAt);

    const notes = field('notes');
    notes.innerHTML = render(r.notes);
    notes.hidden = !r.notes;

    const assets = field('assets');
    for (const a of r.assets) {
      const asset = assetTpl.content.firstElementChild!.cloneNode(true) as HTMLAnchorElement;
      asset.href = a.url;
      asset.querySelector('[data-field="name"]')!.textContent = a.name;
      asset.querySelector('[data-field="size"]')!.textContent = `· ${formatSize(a.size)}`;
      assets.append(asset);
    }
    return item;
  });

  list.replaceChildren(...items);
  list.hidden = items.length === 0;
  empty.hidden = items.length > 0;
  if (items.length === 0) empty.textContent = 'No earlier releases yet.';
}

/** Convenience used by components that only show the latest release. */
export function hydrateLatest(): void {
  loadReleases().then((releases) => {
    if (releases) applyLatest(pickLatest(releases));
  });
}
