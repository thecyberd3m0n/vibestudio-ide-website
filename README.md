# VibeStudio IDE — website

Static landing page for [VibeStudio IDE](https://github.com/thecyberd3m0n/VibeStudioIDE), built with [Astro](https://astro.build).

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build      # output in ./dist
npm run preview
```

Release downloads are fetched from the GitHub Releases API at build time. Set
`GITHUB_TOKEN` in the environment to avoid rate limits in CI; when the API is
unavailable the pages fall back to linking the GitHub releases page.

## Configuration

Edit [`src/config.ts`](src/config.ts) to change the repository, package id,
site URL or to flip `fdroidPublished` once the app lands in the F-Droid
catalogue. Update `site` in `astro.config.mjs` to the deployed domain.
