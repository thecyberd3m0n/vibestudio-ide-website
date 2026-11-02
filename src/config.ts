export const site = {
  name: 'VibeStudio IDE',
  tagline: 'An agentic, on-device IDE for Android.',
  description:
    'VibeStudio IDE is a native Android app that puts a full, AI-driven development environment on your phone. No cloud build box, no account, nothing phones home.',
  /** Public origin of the deployed site (set via SITE_URL in astro.config.mjs). */
  url: import.meta.env.SITE ?? 'https://vibestudio-ide.dev',
  author: {
    name: 'Dmitrij Rysanow',
    url: 'https://dmitrijrysanow.pro',
  },
  github: {
    owner: 'thecyberd3m0n',
    repo: 'VibeStudioIDE',
  },
  packageId: 'com.vibestudio.app',
  /** Set to true once the app is published on F-Droid. */
  fdroidPublished: false,
  minAndroid: 'Android 8.0 (API 26)',
  arch: 'aarch64 (arm64-v8a)',
} as const;

export const repoUrl = `https://github.com/${site.github.owner}/${site.github.repo}`;
export const releasesUrl = `${repoUrl}/releases`;
export const issuesUrl = `${repoUrl}/issues`;
export const fdroidUrl = `https://f-droid.org/packages/${site.packageId}/`;

/** Base path the site is served from, without trailing slash ('' at the root). */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Prefix a root-relative path (e.g. '/images/x.png', '/#features') with the base path. */
export const withBase = (path: string) => `${base}${path === '/' ? '/' : path}`;
