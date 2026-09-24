<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AirportScene from './components/AirportScene.vue'
import { SCENARIOS, getScenario, getScenarioState } from './data/hiro.js'
import { VIDEO } from './data/scenario.js'

const frame = ref(0), playing = ref(false), speed = ref(1), zoom = ref(1), mode = ref('presentation')
const showAircraft = ref(true), showRoute = ref(true), showLabels = ref(true), showHotspots = ref(false)
const panel = ref('scenario'), exporting = ref(false)
const direction = ref('21'), scenarioId = ref('segregated')
const scenario = computed(() => getScenario(scenarioId.value, direction.value))
const selectedOption = computed(() => SCENARIOS.find(item => item.id === scenarioId.value))
const directionLocked = computed(() => selectedOption.value.directions.length === 1)
const lastFrame = computed(() => Math.ceil(scenario.value.duration * VIDEO.fps))
const seconds = computed(() => frame.value / VIDEO.fps)
const state = computed(() => getScenarioState(scenarioId.value, direction.value, seconds.value))
const activeAircraft = computed(() => state.value.aircraft.filter(aircraft => aircraft.display !== 'hidden'))
const ruler = computed(() => Array.from({ length: 7 }, (_, index) => Math.round(scenario.value.duration * index / 6)))
function formatTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}
const clock = computed(() => `${formatTime(seconds.value)}.${String(frame.value % VIDEO.fps).padStart(2, '0')}`)
let animationId, lastTime = null, fraction = 0

watch([direction, scenarioId], () => {
  if (!selectedOption.value.directions.includes(direction.value)) direction.value = selectedOption.value.directions[0]
  restart()
  zoom.value = 1
})
function tick(now) {
  if (playing.value && lastTime !== null) {
    fraction += (now - lastTime) / 1000 * VIDEO.fps * speed.value
    const count = Math.floor(fraction)
    fraction -= count
    frame.value = Math.min(lastFrame.value, frame.value + count)
    if (frame.value >= lastFrame.value) playing.value = false
  }
  lastTime = now
  animationId = requestAnimationFrame(tick)
}
function togglePlay() {
  if (!playing.value && frame.value >= lastFrame.value) frame.value = 0
  playing.value = !playing.value
  fraction = 0
  lastTime = null
}
function restart() { frame.value = 0; fraction = 0; playing.value = false; lastTime = null }
function seekTo(time) { frame.value = Math.min(lastFrame.value, Math.max(0, Math.round(time * VIDEO.fps))); fraction = 0 }
function seek(event) { frame.value = Number(event.target.value); fraction = 0 }
function keydown(event) {
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(event.target.tagName)) return
  if (event.code === 'Space') { event.preventDefault(); togglePlay() }
  if (event.code === 'ArrowRight') { event.preventDefault(); playing.value = false; frame.value = Math.min(lastFrame.value, frame.value + 1) }
  if (event.code === 'ArrowLeft') { event.preventDefault(); playing.value = false; frame.value = Math.max(0, frame.value - 1) }
}
onMounted(() => { animationId = requestAnimationFrame(tick); window.addEventListener('keydown', keydown) })
onUnmounted(() => { cancelAnimationFrame(animationId); window.removeEventListener('keydown', keydown) })
</script>

<template>
  <div class="studio">
    <header class="app-header">
      <a class="brand" href="#" @click.prevent="restart"><span class="brand-mark">↗</span><span>GROUND<span class="brand-light">FRAME</span><small>VTBD · MOVEMENT STUDIO</small></span></a>
      <div class="project-name"><span class="status-dot"></span>Don Mueang International<span class="project-tag">HIRO SCENARIOS</span></div>
      <button class="export-button" @click="exporting = true">Export video <span>↗</span></button>
    </header>
    <main class="workspace">
      <section class="main-column">
        <div class="workspace-heading"><div><p class="eyebrow">AERODROME / THAILAND</p><h1>Ground movement</h1></div><div class="view-switch" aria-label="Map appearance"><button :class="{ active: mode === 'presentation' }" @click="mode = 'presentation'">Presentation</button><button :class="{ active: mode === 'chart' }" @click="mode = 'chart'">Chart</button></div></div>
        <div class="preview-frame">
          <AirportScene :scenario="scenarioId" :direction="direction" :frame="frame" :fps="VIDEO.fps" :mode="mode" :zoom="zoom" :show-aircraft="showAircraft" :show-route="showRoute" :show-labels="showLabels" :show-hotspots="showHotspots" />
          <div class="map-tools"><button aria-label="Zoom out" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - .25)">−</button><button class="zoom-readout" @click="zoom = 1" title="Fit entire airport">{{ Math.round(zoom * 100) }}%</button><button aria-label="Zoom in" :disabled="zoom >= 2.5" @click="zoom = Math.min(2.5, zoom + .25)">+</button></div>
        </div>
        <section class="timeline" aria-label="Animation timeline">
          <div class="timeline-controls"><div class="transport"><button aria-label="Restart" class="restart" @click="restart">↺</button><button :aria-label="playing ? 'Pause' : 'Play'" class="play" @click="togglePlay">{{ playing ? 'Ⅱ' : '▶' }}</button><span class="timecode">{{ clock }} <span>/ {{ formatTime(scenario.duration) }}</span></span></div><div class="timeline-right"><label for="speed">Playback</label><select id="speed" v-model.number="speed"><option :value=".5">0.5×</option><option :value="1">1×</option><option :value="2">2×</option><option :value="4">4×</option><option :value="8">8×</option></select><span class="fps-label">30 FPS</span></div></div>
          <div class="ruler"><span v-for="value in ruler" :key="value">{{ formatTime(value) }}</span></div>
          <input class="scrubber" type="range" aria-label="Video frame" min="0" :max="lastFrame" :value="frame" @input="seek" />
          <div class="track"><span class="track-label"><i></i>SEQUENCE</span><div class="track-segments"><button v-for="(event, index) in scenario.events" :key="`${event.time}-${index}`" @click="seekTo(event.time)" :title="`${formatTime(event.time)} · ${event.label}`" :style="{ flexGrow: Math.max(1, (scenario.events[index + 1]?.time ?? scenario.duration) - event.time) }">{{ event.label }}</button></div></div>
          <p class="timeline-caption">{{ state.caption || state.phase }}</p>
        </section>
        <footer class="workspace-footer"><span><span class="status-dot"></span>Scenario clock uses real seconds · Playback speed is adjustable</span><span>SPACE play / pause <b>·</b> ← → step frame</span></footer>
      </section>
      <aside class="inspector">
        <div class="inspector-section"><p class="eyebrow">SCENARIO & RUNWAY IN USE</p><label for="movement">Scenario</label><select id="movement" v-model="scenarioId" class="scenario-select"><option v-for="item in SCENARIOS" :key="item.id" :value="item.id">{{ item.label }}</option></select><label for="direction">Runway direction</label><select id="direction" v-model="direction" :disabled="directionLocked" class="direction-select"><option value="21">RWY-IN-USE 21</option><option value="03">RWY-IN-USE 03</option></select><p v-if="directionLocked" class="source-note">This scenario is specified for RWY-IN-USE 21.</p><p class="source-note">{{ scenario.description }}</p><p class="speed-profile">LOC 180 kt <span>→</span> 150 kt inside 5 NM</p></div>
        <div class="inspector-tabs"><button :class="{ active: panel === 'layout' }" @click="panel = 'layout'">Layout</button><button :class="{ active: panel === 'scenario' }" @click="panel = 'scenario'">Scenario</button></div>
        <template v-if="panel === 'layout'">
          <div class="inspector-section"><p class="eyebrow">AIRPORT OVERVIEW</p><div class="airport-code">VTBD <span>DMK</span></div><p class="muted">Don Mueang International<br>Bangkok, Thailand</p><div class="mini-stats"><div><b>02</b><span>Runways</span></div><div><b>04</b><span>Scenarios</span></div></div></div>
          <div class="inspector-section"><p class="eyebrow">RUNWAY CONFIGURATION</p><div class="runway-card"><span class="runway-icon">Ⅱ</span><div><b>03L / 21R</b><small>3,700 × 60 m</small></div><span class="runway-tag">WEST</span></div><div class="runway-card"><span class="runway-icon">Ⅱ</span><div><b>03R / 21L</b><small>3,500 × 45 m</small></div><span class="runway-tag">EAST</span></div></div>
          <div class="inspector-section"><p class="eyebrow">VISIBLE LAYERS</p><label class="toggle-row"><span>Area labels</span><input type="checkbox" v-model="showLabels" /><span class="switch"></span></label><label class="toggle-row"><span>Chart hot spots</span><input type="checkbox" v-model="showHotspots" /><span class="switch"></span></label><label class="toggle-row"><span>Aircraft</span><input type="checkbox" v-model="showAircraft" /><span class="switch"></span></label><label class="toggle-row"><span>Aircraft routes</span><input type="checkbox" v-model="showRoute" /><span class="switch"></span></label></div>
          <div class="inspector-section source-section"><p class="eyebrow">REFERENCE</p><a href="/reference/AD%20GND%20Chart.pdf" target="_blank" rel="noopener"><span class="pdf-icon">PDF</span><span>VTBD ground movement chart<small>Supplied source document</small></span><b>↗</b></a><p class="source-note">Chart geometry is preserved as vector artwork. Presentation colors are restyled.</p></div>
        </template>
        <template v-else>
          <div class="inspector-section"><p class="eyebrow">CURRENT TRAFFIC</p><div class="phase-badge">{{ state.phase }}</div><div v-for="aircraft in activeAircraft" :key="aircraft.id" class="traffic-card" :style="{ '--traffic-color': aircraft.color }"><div><b>{{ aircraft.callsign }}</b><span>{{ aircraft.type }} · {{ aircraft.wtc }}</span></div><p>RWY {{ aircraft.runway }} · {{ aircraft.phase }}</p></div><p v-if="scenario.departureRunway" class="source-note">{{ direction === '21' ? 'Departures: straight for 1.5 NM beyond runway end, then right to heading 280°.' : 'Departures: straight for 2.5 NM beyond runway end, then left to heading 300°.' }}</p></div>
          <div class="inspector-section"><p class="eyebrow">SEQUENCE</p><button class="event-row" v-for="(event, index) in scenario.events" :key="`${event.time}-${index}`" @click="seekTo(event.time)"><span>{{ formatTime(event.time) }}</span><b>{{ event.label }}</b><i>↗</i></button></div>
        </template>
        <div class="inspector-bottom"><span class="status-dot"></span>1920 × 1080 <span>30 FPS · {{ formatTime(scenario.duration) }}</span></div>
      </aside>
    </main>
    <div v-if="exporting" class="modal-backdrop" @click.self="exporting = false"><section role="dialog" aria-modal="true" aria-labelledby="export-title" class="export-dialog"><button class="close" aria-label="Close export instructions" @click="exporting = false">×</button><p class="eyebrow">PELLICULE VIDEO EXPORT</p><h2 id="export-title">Render your presentation</h2><p>Render {{ scenario.label }} in Full HD ({{ formatTime(scenario.duration) }}):</p><pre>npm.cmd run video:render -- --scenario={{ scenarioId }} --direction={{ direction }}</pre><p>The MP4 will be saved to <code>renders/vtbd-{{ scenarioId }}-{{ direction }}.mp4</code>.</p><div class="export-detail"><b>Quick 3-second check of this scenario</b><code>npm.cmd run video:sample -- --scenario={{ scenarioId }} --direction={{ direction }}</code></div><p class="source-note">The export uses the selected scenario, runway direction, and real-time scenario clock. Layer, zoom, and playback controls affect the studio preview.</p><button class="export-button" @click="exporting = false">Got it</button></section></div>
  </div>
</template>
