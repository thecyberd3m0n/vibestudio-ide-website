// @ts-check
import { defineConfig } from 'astro/config';

// Deployment target. Defaults to the GitHub Pages project URL; override in CI
// (or locally) once the custom domain is live:
//   SITE_URL=https://vibestudio-ide.dev BASE_PATH=/ npm run build
const siteUrl = process.env.SITE_URL ?? 'https://thecyberd3m0n.github.io';
const basePath = process.env.BASE_PATH ?? '/vibestudio-ide-website';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: basePath,
  trailingSlash: 'ignore',
});
