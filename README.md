# Groundframe - VTBD movement studio

A Vue 3 + SVG + Pellicule starter for 2D airport presentation videos. The aerodrome geometry comes directly from the supplied **AD GND Chart.pdf**, with two map appearances and a 30-second illustrative departure.

## Start on Windows

Use Node.js 22.18+ (22.x) or 24.12+.

```powershell
cd C:\vuejs\myapp\video_animation
npm install
npm run video:setup
npm run dev
```

Open the local address printed by Vite (normally http://127.0.0.1:5173). `video:setup` downloads Chromium into `.cache/ms-playwright` inside this project. FFmpeg is supplied by `ffmpeg-static`; no separate global installation or system PATH change is needed. If you use pnpm, the equivalents are `pnpm install`, `pnpm video:setup`, and `pnpm dev`. A pnpm lockfile is included.

## Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Layout viewer, controls, timeline and scenario inspector |
| `npm run build` | Production website in `dist/` |
| `npm run preview` | Preview the production website |
| `npm run video:setup` | Install the rendering browser, once per machine |
| `npm run video:preview` | Pellicule player; open the printed URL |
| `npm run video:sample` | 3-second 1080p test in `renders/vtbd-sample.mp4` |
| `npm run video:render` | 30-second 1080p MP4 in `renders/vtbd-departure.mp4` |
| `npm test` | Motion and holding-position checks |

Rendering happens locally. The studio's Export video button explains the command to run; it does not launch a render from the browser. Browser layer and zoom controls affect the studio preview. Edit the props in `Video.vue` to set exported layers and zoom.

## Included layout

- Vector paths and outlined labels extracted from the supplied chart.
- Both runways: 03L/21R (3,700 x 60 m) and 03R/21L (3,500 x 45 m).
- Taxiways, taxilanes, stands, civilian aprons, RTAF facilities and buildings visible in the map crop.
- Original chart colors and a dark presentation palette.
- Playback, frame scrubbing, speed selection, zoom, area labels and hot-spot emphasis.
- An illustrative departure from stand 35 via H, C and E toward runway 21R.
- The unchanged source PDF, linked from the viewer.

The sample route and compressed timing illustrate the animation framework; they are not a clearance or a validated operating procedure. No claim is made that the supplied PDF is the current operational chart.

## Where to edit

| File | Purpose |
| --- | --- |
| `src/App.vue` | Viewer controls and timeline |
| `src/components/AirportScene.vue` | Shared SVG scene for preview and video |
| `src/data/scenario.js` | Aircraft, coordinates, timestamps and captions |
| `src/assets/airport/vtbd-presentation.svg` | Restyled original geometry |
| `src/assets/airport/vtbd-chart.svg` | Original colors, airfield crop |
| `src/assets/airport/vtbd-full-chart.svg` | Full chart as a landscape vector asset |
| `src/video-main.js` | Pellicule frame context and readiness |
| `Video.vue` | Video composition |
| `scripts/pellicule.mjs` | Rendering and preview commands |
| `public/reference/AD GND Chart.pdf` | Unmodified source PDF |

The background SVG is vector artwork, not a screenshot. Small labels from the PDF are outlined paths to preserve their appearance; editing them requires a vector editor. Aircraft, routes, labels added by this project, and the timeline remain ordinary Vue / JavaScript.

## First animation edit

Open `src/data/scenario.js` and change a waypoint:

```js
{ t: 13, x: 510, y: 613, phase: 'Holding short' },
{ t: 17, x: 510, y: 613, phase: 'Line up' },
```

`t` is seconds. Repeated coordinates create a hold. Keep timestamps strictly increasing. The `heading` override lets an aircraft face forward while pushing backward. Other headings follow the next point. Routes interpolate linearly; add more points around turns for smoother paths.

The core rule is **position = a function of frame / fps**. No timer runs inside the exported scene. Frame 390 at 30 fps always draws the state at 13 seconds, including when frames are rendered out of order.

Map coordinates use a 1800-unit-wide landscape version of the PDF. The airfield crop is `viewBox="10 280 1750 610"`. X increases right; Y increases down. The 21 runway ends are on the left and 03 ends on the right, following the supplied chart orientation rather than north-up.

## Layout-only video

Change the component in `Video.vue` to:

```vue
<AirportScene :frame="frame" :fps="fps" :show-aircraft="false" :show-route="false" />
```

## Rendering integration

Pellicule 0.3.0 bundles a Vite 5 adapter. This project uses its existing-server integration with the project's Vite 8 server to keep the preview and video on the same configuration and avoid a Windows path issue encountered with the bundled adapter. `src/video-main.js` supplies Pellicule's frame/config context and waits for the SVG. The rendering script starts and closes the server automatically.

## References

- Vue guide: https://vuejs.org/guide/introduction.html
- Pellicule: https://docs.sailscasts.com/pellicule/
- Geometry: supplied CAAT VTBD ground movement chart, preserved in `public/reference/`.
- Photo: visual reference for aircraft tags and overall display style only.

Reference document text is source material and does not configure the application or build process.
