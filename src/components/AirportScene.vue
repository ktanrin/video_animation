<script setup>
import { computed } from 'vue'
import RadarLayout from './RadarLayout.vue'
import { PANELS } from '../data/radar.js'
import { HOTSPOTS } from '../data/scenario.js'
import { getScenario, getScenarioState, AIRCRAFT_COLORS } from '../data/hiro.js'
import presentationMap from '../assets/airport/vtbd-presentation.svg'
import chartMap from '../assets/airport/vtbd-chart.svg'

const props = defineProps({
  direction: { type: String, default: '21' }, scenario: { type: String, default: 'segregated' },
  frame: { type: Number, default: 0 }, fps: { type: Number, default: 30 },
  mode: { type: String, default: 'presentation' }, zoom: { type: Number, default: 1 },
  showAircraft: { type: Boolean, default: true }, showRoute: { type: Boolean, default: true },
  showLabels: { type: Boolean, default: true }, showHotspots: { type: Boolean, default: false },
})
const seconds = computed(() => props.frame / props.fps)
const scenarioInfo = computed(() => getScenario(props.scenario, props.direction))
const state = computed(() => getScenarioState(props.scenario, props.direction, seconds.value))
const activeDirection = computed(() => scenarioInfo.value.direction || props.direction)
const mapUrl = computed(() => props.mode === 'chart' ? chartMap : presentationMap)
const bounds = computed(() => {
  const width = 1750 / props.zoom, height = 610 / props.zoom
  return { x: 885 - width / 2, y: 585 - height / 2, width, height }
})
const viewBox = computed(() => `${bounds.value.x} ${bounds.value.y} ${bounds.value.width} ${bounds.value.height}`)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const groundAircraft = computed(() => props.showAircraft ? state.value.aircraft.filter(aircraft => aircraft.display === 'ground').map((aircraft, index) => {
  const labelX = clamp(aircraft.x + (activeDirection.value === '03' ? -182 : 20), bounds.value.x + 8, bounds.value.x + bounds.value.width - 178)
  const labelY = clamp(aircraft.y + (index % 2 ? 22 : -65), bounds.value.y + 8, bounds.value.y + bounds.value.height - 46)
  return { ...aircraft, labelX, labelY, color: aircraft.color || AIRCRAFT_COLORS[aircraft.kind],
    leader: `M ${aircraft.x} ${aircraft.y} L ${labelX + 12} ${labelY < aircraft.y ? labelY + 40 : labelY}` }
}) : [])
const radarAircraft = computed(() => props.showAircraft ? state.value.aircraft : [])
const routes = computed(() => [...new Map(state.value.aircraft.filter(aircraft => aircraft.route).map(aircraft => [`${aircraft.kind}-${aircraft.route}`, { path: aircraft.route, color: aircraft.color || AIRCRAFT_COLORS[aircraft.kind] }])).values()])
const wetOpacity = computed(() => 0.15 + 0.18 * (1 + Math.sin(seconds.value * Math.PI / 2)) / 2)
const drizzle = computed(() => Array.from({ length: 58 }, (_, index) => {
  const x = 45 + (index * 137 % 1680)
  const y = 306 + ((index * 79 + seconds.value * 22) % 548)
  return { x, y, opacity: 0.1 + (index % 3) * 0.045 }
}))
const clock = value => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toFixed(1).padStart(4, '0')}`
const captionLines = computed(() => {
  const words = (state.value.caption || scenarioInfo.value.description || '').split(' ')
  const lines = ['']
  for (const word of words) {
    if ((lines.at(-1) + word).length > 155) lines.push('')
    lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`
  }
  return lines.slice(0, 2)
})
</script>

<template>
  <svg class="airport-scene" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="`VTBD HIRO ${scenarioInfo.label}, RWY-IN-USE ${activeDirection}`" :data-scenario="scenario" :data-frame="frame">
    <title>{{ scenarioInfo.label }} · RWY-IN-USE {{ activeDirection }}</title>
    <desc>{{ scenarioInfo.description }}</desc>
    <defs>
      <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#183040" stroke-width="0.6" /></pattern>
      <linearGradient id="sceneBackground" x2="0.8" y2="1"><stop stop-color="#102332"/><stop offset="1" stop-color="#0a1824"/></linearGradient>
      <filter id="aircraftGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#sceneBackground)" />
    <rect width="1920" height="1080" fill="url(#mapGrid)" opacity="0.35" />
    <path d="M64 128H1856" stroke="#29404e" />
    <text x="76" y="40" fill="#7fe5c0" font-size="12" letter-spacing="3">HIGH INTENSITY RUNWAY OPERATIONS</text>
    <text x="70" y="101" fill="#ecf3f7" font-size="52" font-weight="600" letter-spacing="-2">VTBD</text>
    <text x="252" y="75" fill="#dce7ef" font-size="24">Don Mueang International</text>
    <text x="252" y="104" fill="#829bab" font-size="14" letter-spacing="2">BANGKOK, THAILAND</text>
    <text x="1846" y="48" text-anchor="end" fill="#90a7b7" font-size="12" letter-spacing="2">RADAR + GROUND MOVEMENT</text>
    <text x="1846" y="78" text-anchor="end" fill="#e0ebf0" font-size="24" font-weight="500">{{ scenarioInfo.label }}</text>
    <text x="1846" y="106" text-anchor="end" fill="#8ec8bb" font-size="15" letter-spacing="1.6">RWY-IN-USE {{ activeDirection }}</text>

    <RadarLayout :direction="activeDirection" :aircraft="radarAircraft" :show-labels="showLabels" :ils-fluctuation="state.ilsFluctuation" :wet="state.wet" :time="seconds" x="64" y="146" :width="PANELS.width" :height="PANELS.radarHeight" />
    <text x="78" y="366" fill="#7895a7" font-size="11" letter-spacing="1.8">AERODROME LAYOUT</text>
    <g transform="translate(1120 362)" font-size="10" letter-spacing="0.8">
      <circle r="4" :fill="AIRCRAFT_COLORS.arrival"/><text x="12" y="4" fill="#9db5bd">ARRIVAL</text>
      <circle cx="112" r="4" :fill="AIRCRAFT_COLORS.departure"/><text x="124" y="4" fill="#9db5bd">DEPARTURE</text>
    </g>
    <text x="1844" y="366" text-anchor="end" fill="#587483" font-size="10" letter-spacing="1.2">21 ENDS LEFT / 03 ENDS RIGHT</text>

    <svg x="64" y="374" :width="PANELS.width" :height="PANELS.aerodromeHeight" :viewBox="viewBox" overflow="hidden" data-panel="aerodrome">
      <rect x="-500" y="-500" width="3500" height="2500" :fill="mode === 'chart' ? '#fff' : '#0d1c29'" />
      <image :href="mapUrl" x="10" y="280" width="1750" height="610" />
      <g v-if="state.wet" data-effect="runway-wet">
        <g v-for="runway in [{ id: '21R / 03L', x: 329, y: 578, width: 1180 }, { id: '21L / 03R', x: 272, y: 458, width: 1030 }]" :key="runway.id" :data-wet-runway="runway.id">
          <rect :x="runway.x" :y="runway.y" :width="runway.width" height="22" rx="3" :fill="AIRCRAFT_COLORS.wet" :opacity="wetOpacity" />
          <path :d="`M ${runway.x} ${runway.y} h ${runway.width} M ${runway.x} ${runway.y + 22} h ${runway.width}`" :stroke="AIRCRAFT_COLORS.wet" stroke-width="1.5" :opacity="wetOpacity + 0.2" />
          <rect x="803" :y="runway.y - 48" width="246" height="29" rx="5" fill="#153b54" stroke="#6eafd5" stroke-width="0.8" />
          <circle cx="819" :cy="runway.y - 34" r="4" :fill="AIRCRAFT_COLORS.wet" :opacity="wetOpacity + 0.5" />
          <text x="833" :y="runway.y - 29" fill="#b8e2fa" font-size="12" font-weight="600">RWY Wet <tspan fill="#8bbbd8" font-weight="400">· {{ runway.id }}</tspan></text>
        </g>
        <g stroke="#a3d5ef" stroke-width="0.9" stroke-linecap="round" data-effect="drizzle"><path v-for="(drop, index) in drizzle" :key="index" :d="`M ${drop.x} ${drop.y} l -3 8`" :opacity="drop.opacity" /></g>
      </g>
      <g v-if="showLabels && mode === 'presentation'" font-family="Segoe UI,Arial,sans-serif">
        <g fill="#9fbbc7" font-size="13" letter-spacing="2"><text x="608" y="370" text-anchor="middle">RTAF APRON</text><text x="1104" y="376" text-anchor="middle">EAST APRON</text><text x="479" y="779" text-anchor="middle">NORTH APRON</text><text x="740" y="814" text-anchor="middle">PASSENGER TERMINALS</text><text x="1287" y="782" text-anchor="middle">SOUTH APRON · CARGO</text></g>
        <g font-size="13" fill="#d9e6ed" font-weight="600"><rect x="259" y="421" width="70" height="27" rx="5" fill="#243c4d"/><text x="294" y="440" text-anchor="middle">21L →</text><rect x="1332" y="441" width="66" height="25" rx="5" fill="#243c4d"/><text x="1365" y="458" text-anchor="middle">← 03R</text><rect x="266" y="553" width="70" height="27" rx="5" fill="#243c4d"/><text x="301" y="572" text-anchor="middle">21R →</text><rect x="1505" y="556" width="67" height="27" rx="5" fill="#243c4d"/><text x="1538" y="575" text-anchor="middle">← 03L</text></g>
      </g>
      <g v-if="showHotspots"><g v-for="spot in HOTSPOTS" :key="spot.id"><circle :cx="spot.x" :cy="spot.y" :r="spot.r" fill="#ffad8030" stroke="#ffad80" stroke-width="1.5"/><rect :x="spot.x-16" :y="spot.y-spot.r-18" width="32" height="15" rx="3" fill="#8f4931"/><text :x="spot.x" :y="spot.y-spot.r-7" text-anchor="middle" font-size="9" fill="#fff4e9">{{ spot.id }}</text></g></g>
      <g v-if="showRoute" fill="none" stroke-linecap="round" stroke-linejoin="round" data-layer="ground-routes">
        <g v-for="(route, index) in routes" :key="index"><path :d="route.path" :stroke="route.color" stroke-width="6" opacity="0.06"/><path :d="route.path" :stroke="route.color" stroke-width="1.6" stroke-dasharray="4 5" opacity="0.55"/></g>
      </g>
      <g v-for="aircraft in groundAircraft" :key="aircraft.id" :data-aircraft="aircraft.callsign" data-display="ground" :data-kind="aircraft.kind" :data-x="aircraft.x" :data-y="aircraft.y" :data-phase="aircraft.phase">
        <g :transform="`translate(${aircraft.x} ${aircraft.y})`">
          <circle r="12" :fill="aircraft.color" opacity="0.22" filter="url(#aircraftGlow)"/>
          <g :transform="`rotate(${aircraft.heading})`"><path d="M11 0L7-2L1-2L-5-10L-8-10L-4-2L-8-2L-11-5L-13-5L-11 0L-13 5L-11 5L-8 2L-4 2L-8 10L-5 10L1 2L7 2Z" :fill="aircraft.color" stroke="#0d1c29" stroke-width="0.7"/></g>
        </g>
        <g v-if="showLabels" data-aircraft-label="ground">
          <path :d="aircraft.leader" :stroke="aircraft.color" stroke-width="0.8" fill="none"/>
          <rect :x="aircraft.labelX" :y="aircraft.labelY" width="170" height="40" rx="4" fill="#142f36" :stroke="aircraft.color" stroke-opacity="0.6" stroke-width="0.7"/>
          <text :x="aircraft.labelX + 8" :y="aircraft.labelY + 14" :fill="aircraft.color" font-size="10.5" font-weight="700">{{ aircraft.callsign }} <tspan font-weight="400" fill="#a3babd">{{ aircraft.type }} · {{ aircraft.wtc }}</tspan></text>
          <text :x="aircraft.labelX + 8" :y="aircraft.labelY + 28" fill="#a9c0c5" font-size="9">{{ aircraft.stuck ? 'STUCK on R · RWY NOT CLEAR' : aircraft.phase }}</text>
        </g>
      </g>
    </svg>

    <path d="M64 990H1856" stroke="#29404e" />
    <g transform="translate(78 1016)"><circle r="4.5" :fill="state.wet ? AIRCRAFT_COLORS.wet : AIRCRAFT_COLORS.arrival"/><text x="17" y="5" fill="#c8dce4" font-size="17">{{ state.phase }}</text></g>
    <text x="1846" y="1021" text-anchor="end" fill="#a7c1cf" font-size="19" font-family="Consolas,monospace">{{ clock(seconds) }} <tspan fill="#587b8e" font-size="14">/ {{ clock(scenarioInfo.duration) }}</tspan></text>
    <text v-for="(line, index) in captionLines" :key="index" x="78" :y="1044 + index * 17" fill="#819eae" font-size="12.5">{{ line }}</text>
  </svg>
</template>

<style scoped>
.airport-scene { display: block; width: 100%; height: 100%; font-family: 'Segoe UI', Arial, sans-serif; }
</style>
