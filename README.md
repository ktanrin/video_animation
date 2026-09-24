# Groundframe — VTBD HIRO movement studio

Vue + SVG animation of four HIRO scenarios, using the supplied VTBD ground chart. The radar and aerodrome views share one deterministic aircraft timeline. Reference video content is reference material; the scenario brief and confirmed speed profile determine the behavior.

## Run

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run build
```

The Scenario dropdown contains:

| Scenario | Runway in use | Sequence |
| --- | --- | --- |
| 1 Segregated | 21 / 03 | Arrivals on 21R via O / 03L via F; departures on 21L / 03R |
| 2 Mixed | 21 / 03 | Arrival–departure–arrival on 21R / 03L; departure holds via D / S, lines up for 40 s when the first arrival starts vacating, holds for 10 s, then rolls; first arrival clears in 70 s; initial arrival spacing 8 / 10 NM |
| 3 Crossing & Rolling within 2nm | 21 | Departure crosses 21R via D for 40 s with arrival 1 at 4 NM, causing the illustrated ILS fluctuation; lines up on 21L via D and rolls when arrival 2 reaches 2 NM |
| 4 Un-routine | 21 | Light drizzle and slowly flashing blue highlights with RWY Wet labels on both runways; three arrivals initially 5 NM apart; medium aircraft 1 clears via O in 80 s, aircraft 2 becomes stuck on rapid exit R before the holding line; heavy aircraft goes around at 1 NM while the runway remains uncleared |

Scenarios 3 and 4 select and lock **RWY-IN-USE 21**. Both runway directions are available for scenarios 1 and 2.

## Motion and timing

The clock displays real scenario seconds. Change playback speed (0.5× through 8×) to review faster, or click a sequence event to jump to it. Space plays/pauses; arrow keys step a frame. Changing scenario or direction resets playback.

Arrivals fly at **180 kt on the localizer and 150 kt inside 5 NM**, as requested. Listed spacing is the initial separation; spacing naturally compresses while the leading aircraft slows before the following aircraft. In Scenario 4, the first two aircraft cross the threshold at 120 s and 220 s. Aircraft 2 stops on rapid exit R at 292 s (illustrative taxi timing) and remains visible before its holding line through the end of the scenario. The heavy aircraft reaches 1 NM and goes around at 296 s. Aircraft 2 never produces a runway-clear event.

Runway occupancy starts at threshold passage and ends when the entire aircraft is beyond the exit holding line. Exit geometry is traced from the existing chart artwork. These are illustrative animation paths, not surveyed coordinates.

Departures transfer from the aerodrome to radar at the physical runway end, using the shared chart-to-radar conversion. Beyond the runway end:

- RWY-IN-USE 21: straight for 1.5 NM, then right to heading 280°.
- RWY-IN-USE 03: straight for 2.5 NM, then left to heading 300°.

Arrival aircraft remain teal; departure aircraft are light yellow. Wet-runway lighting and drizzle use blue. Weather and ILS animation are computed from the selected frame, so scrubbing and video export reproduce the same image.

The radar uses an independent 32-pixel/NM scale, with 5 NM range rings centered on the 21R threshold and 15 NM localizer guides. The aerodrome keeps the supplied chart orientation (21 ends left, 03 ends right).

## Video export

Install the local rendering browser once:

```powershell
npm.cmd run video:setup
```

The Export video dialog supplies a command for the selected scenario and direction. Examples:

```powershell
npm.cmd run video:preview -- --scenario=mixed --direction=03
npm.cmd run video:sample -- --scenario=unroutine --direction=21
npm.cmd run video:render -- --scenario=segregated --direction=21
npm.cmd run video:render -- --scenario=unroutine --direction=21 --speed=4
```

Scenario IDs: `segregated`, `mixed`, `crossing`, `unroutine`. Exports use the full scenario duration at 1920 × 1080, 30 FPS. A sample renders the first three seconds. Files are saved to `renders/vtbd-SCENARIO-DIRECTION.mp4` (samples add `sample-` before the scenario). Selecting 03 for crossing or unroutine normalizes to 21 and reports that choice.

Use `--speed=4` for 4× playback: the whole scenario is shown in one-quarter of the time, still at 30 FPS. Supported speeds are `0.5`, `1`, `2`, `4`, and `8`; accelerated exports add the speed to the filename, such as `vtbd-unroutine-21-4x.mp4`. The scene clock continues to show scenario time.

The preview and export use the same scene and movement engine. Browser layer, zoom, and playback speed controls affect only the studio preview. The Export button displays instructions; rendering is launched from the terminal.

## Files

| File | Purpose |
| --- | --- |
| `src/data/hiro.js` | Four scenarios, aircraft routes, timings, speed profile, and events |
| `src/data/radar.js` | Radar geometry and coordinate conversion |
| `src/App.vue` | Scenario selection, playback, inspector, and export instructions |
| `src/components/AirportScene.vue` | Ground traffic, wet runway, drizzle, and shared composition |
| `src/components/RadarLayout.vue` | Radar traffic, localizers, and ILS fluctuation |
| `Video.vue`, `src/video-main.js` | Pellicule frame and video configuration |
| `scripts/pellicule.mjs` | Local MP4 render and preview commands |
| `scripts/hiro.test.mjs` | Scenario timing, separation, runway transfer, and deterministic motion checks |
| `scripts/check-preview.mjs` | Browser checks (run with the dev server on port 5173) |
| `src/assets/airport/` | Original chart and presentation SVG artwork |
| `public/reference/AD GND Chart.pdf` | Supplied source chart |

The older single-aircraft modules remain in `src/data/arrival.js` and `src/data/scenario.js` for their existing regression checks. They are no longer selectable scenarios.
