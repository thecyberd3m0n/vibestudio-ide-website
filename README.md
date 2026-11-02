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

## Hero phone scene

The hero renders the smartphone from the Remotion ad in
`~/Videos/remotion/vibestudio-ad-1` with [three.js](https://threejs.org)
(`src/scripts/phone-scene.ts`), playing the app screen recording on its display.
Assets live in `public/`:

- `models/smartphone.glb` — `assets/smartphone_highpoly.glb` compressed with
  `npx @gltf-transform/cli optimize --compress meshopt --texture-compress webp --texture-size 1024 --simplify false`
- `video/phone-demo.mp4` — both screen recordings sped up (6× and 3×), joined,
  with 7–14 s cut out like in the ad, downsized to 540×1200 @ 30 fps:

```sh
A=assets/screen-20261101-201333.mp4 B=assets/screen-20261101-001246.mp4
ffmpeg -i "$A" -i "$B" -filter_complex \
  "[0:v]setpts=PTS/6,fps=30,scale=540:-2[a];[1:v]setpts=PTS/3,fps=30,scale=540:-2[b];\
   [a][b]concat=n=2:v=1:a=0[v];[v]select='not(between(t,7,14))',setpts=N/30/TB[out]" \
  -map "[out]" -an -c:v libx264 -crf 27 -preset slow -tune animation -pix_fmt yuv420p \
  -movflags +faststart public/video/phone-demo.mp4
```

Browsers without WebGL fall back to the plain video; `images/og.jpg` is a
capture of the hero used for social previews.
