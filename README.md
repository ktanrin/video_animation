## Linked arrival update

Use **Movement & runway in use** in the sidebar. The default scenario is Arrival.
Choose 21 (left approach, landing on 21R) or 03 (right approach, landing on 03L).
Both runway localizers reverse together and extend 15 NM. The runway pair stays
centered. Five-NM range rings retain their original 21R-threshold origin.

The arrival intercepts at 15 NM, establishes at 10 NM at 4 seconds, and transfers
from radar to the aerodrome edge at 12 seconds. It crosses the threshold at 14s,
touches down at 16s, and vacates during 24–29s. Timing is compressed; taxi exit
points are illustrative chart coordinates, not operational procedure data.

One state and chart-to-radar conversion drive both panels. At frame 360, radar
ownership ends and ground ownership begins, without duplicate aircraft. Scrubbing
is deterministic. Ground zoom is disabled for arrivals to keep the edge handoff
consistent. The original departure demo remains selectable and uses direction 21.

Files: `src/data/arrival.js` for motion; `src/data/radar.js` for geometry;
`src/components/RadarLayout.vue` for the radar drawing.

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run video:render -- --direction=21 --movement=arrival
npm.cmd run video:render -- --direction=03 --movement=arrival
```

Exports are saved as `renders/vtbd-arrival-21.mp4` or `renders/vtbd-arrival-03.mp4`.
The Export dialog supplies the command for the current selection. Export always
uses presentation styling; the same shared scene renders both panels.

---

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

## Surveillance radar panel

The upper radar panel is 1792 x 200 scene units; the aerodrome panel is 1792 x 600. Its height is exactly one-third of the aerodrome panel's height, inside the existing 1920 x 1080 video frame.

- Both parallel runways are shown with their 21 and 03 end labels.
- Localizer course guides extend 15 NM from each 21 threshold toward the approach side. The small ticks are 1 NM apart, with longer ticks every 5 NM.
- Circular rings are centered on the **21R threshold**, at 5, 10, 15, 20, 25, 30 and 35 NM. Rings are clipped at the panel boundary, as in the reference image.
- Radar distance scale is independent of the detailed ground map. It uses 32 scene units per NM (1 NM = 1852 metres). Runway lengths use the same NM scale; runway line widths are emphasized for visibility.
- Relative threshold offsets are approximate measurements from the supplied chart. Localizer lines show course alignment, not signal coverage or certified navigation geometry.
- This is a static radar layout. It does not add simulated radar traffic or connect to live surveillance data.

Edit `src/data/radar.js` to change the ring interval, outer range, radar scale or threshold offsets. Edit `src/components/RadarLayout.vue` for radar styling and labels. `AirportScene.vue` places both panels, so the radar appears in the studio, chart comparison and Pellicule video.
