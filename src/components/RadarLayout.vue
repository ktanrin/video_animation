<script setup>
import { computed } from 'vue'
import { RADAR, RADAR_RUNWAYS, RANGE_RINGS, localizerGeometry } from '../data/radar.js'
import { AIRCRAFT_COLORS } from '../data/hiro.js'

const props = defineProps({
  direction: { type: String, default: '21' },
  aircraft: { type: Array, default: () => [] },
  showLabels: { type: Boolean, default: true },
  ilsFluctuation: { type: Boolean, default: false },
  wet: { type: Boolean, default: false },
  time: { type: Number, default: 0 },
})
const runways = computed(() => RADAR_RUNWAYS.map(runway => ({ ...runway, ...localizerGeometry(runway, props.direction) })))
const ticks = Array.from({ length: RADAR.localizerLengthNm }, (_, i) => i + 1)
const labelY = RADAR.height - 15
const ringLabelX = ring => RADAR.originX - Math.sqrt(ring.radius ** 2 - (labelY - RADAR.originY) ** 2)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const targets = computed(() => props.aircraft.filter(aircraft => aircraft.display === 'radar').map((aircraft, index) => {
  const x = clamp(aircraft.radar.x, 10, RADAR.width - 10)
  const y = clamp(aircraft.radar.y, 39, RADAR.height - 13)
  const outside = aircraft.radar.x < 0 || aircraft.radar.x > RADAR.width || aircraft.radar.y < 0 || aircraft.radar.y > RADAR.height
  const above = index % 2 === 0
  const labelX = clamp(x + (props.direction === '03' ? -186 : 20), 10, RADAR.width - 188)
  const labelTop = above ? 39 : 135
  return { ...aircraft, x, y, outside, labelX, labelTop, color: aircraft.color || AIRCRAFT_COLORS[aircraft.kind],
    leader: `M ${x} ${y} L ${clamp(x + (props.direction === '03' ? -12 : 12), 10, RADAR.width - 10)} ${above ? labelTop + 43 : labelTop - 6} L ${labelX + 12} ${above ? labelTop + 43 : labelTop}` }
}))
const ilsWave = computed(() => {
  const runway = runways.value.find(item => item.activeId === '21R')
  if (!runway) return ''
  return Array.from({ length: 91 }, (_, index) => {
    const progress = index / 90
    const x = runway.activeThreshold.x - progress * 6 * RADAR.pixelsPerNm
    const amplitude = 3 + 4 * Math.sin(progress * Math.PI)
    const y = runway.activeThreshold.y + Math.sin(progress * 18 * Math.PI + props.time * 7) * amplitude
    return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
})
const wetOpacity = computed(() => 0.26 + 0.2 * (1 + Math.sin(props.time * Math.PI / 2)) / 2)
const headingLabel = aircraft => `${Math.round(aircraft.headingMagnetic ?? ((210 + aircraft.heading + 360) % 360)).toString().padStart(3, '0')}°`
const distanceLabel = aircraft => `${Math.max(0, aircraft.distanceNm ?? 0).toFixed(1)} NM`
</script>

<template>
  <svg :viewBox="`0 0 ${RADAR.width} ${RADAR.height}`" xmlns="http://www.w3.org/2000/svg" overflow="hidden" role="img"
    :aria-label="`Surveillance radar, RWY-IN-USE ${direction}, ${targets.length} aircraft`" data-panel="radar">
    <title>VTBD surveillance radar</title>
    <desc>Separate radar scale with 5 nautical mile range rings centered on threshold 21R. Teal targets are arrivals; light yellow targets are departures. Aircraft transfer between the ground and radar displays at the runway end.</desc>
    <rect :width="RADAR.width" :height="RADAR.height" rx="5" fill="#102331" />
    <g data-layer="range-rings" fill="none" stroke="#658294" stroke-width="1" opacity="0.48">
      <circle v-for="ring in RANGE_RINGS" :key="ring.nm" :cx="RADAR.originX" :cy="RADAR.originY" :r="ring.radius" :data-radius-nm="ring.nm" />
    </g>

    <g v-for="runway in runways" :key="runway.id" :data-runway="runway.id">
      <g :stroke="runway.color" fill="none" opacity="0.67">
        <path :d="`M ${runway.courseEnd.x} ${runway.activeThreshold.y} H ${runway.activeThreshold.x}`" stroke-width="1.05" :data-localizer="runway.activeId" />
        <path v-for="nm in ticks" :key="nm" :d="`M ${runway.activeThreshold.x + runway.side * nm * RADAR.pixelsPerNm} ${runway.activeThreshold.y} v ${runway.labelSide * (nm % 5 === 0 ? 8 : 3.5)}`" :stroke-width="nm % 5 === 0 ? 1.15 : 0.75" />
      </g>
      <path v-if="wet" :d="`M ${runway.start.x} ${runway.start.y} H ${runway.end.x}`" :stroke="AIRCRAFT_COLORS.wet" stroke-width="12" :opacity="wetOpacity" data-effect="radar-runway-wet" />
      <path :d="`M ${runway.start.x} ${runway.start.y} H ${runway.end.x}`" stroke="#e1edf3" stroke-width="3.1" />
      <path :d="`M ${runway.threshold.x} ${runway.threshold.y - 3.5} v 7 M ${runway.end.x} ${runway.end.y - 3.5} v 7`" stroke="#f0f7fa" stroke-width="1.15" fill="none" />
      <path :d="`M ${runway.threshold.x - 10} ${runway.threshold.y + runway.labelSide * 24} L ${runway.threshold.x} ${runway.threshold.y + runway.labelSide * 5}`" :stroke="runway.color" stroke-width="0.7" opacity="0.7" fill="none" />
      <text :x="runway.threshold.x - 12" :y="runway.threshold.y + runway.labelSide * 31 + 4" text-anchor="middle" :fill="runway.color" font-size="12" font-weight="600">{{ runway.id }}</text>
      <path :d="`M ${runway.end.x + 14} ${runway.end.y + runway.labelSide * 24} L ${runway.end.x} ${runway.end.y + runway.labelSide * 5}`" :stroke="runway.color" stroke-width="0.7" opacity="0.7" fill="none" />
      <text :x="runway.end.x + 16" :y="runway.end.y + runway.labelSide * 31 + 4" text-anchor="middle" :fill="runway.color" font-size="12" font-weight="600">{{ runway.opposite }}</text>
      <text :x="runway.courseEnd.x" :y="runway.labelSide < 0 ? 91 : 127" :text-anchor="direction === '03' ? 'end' : 'start'" :fill="runway.color" font-size="9" letter-spacing="0.7">LOC {{ runway.activeId }} · 15 NM</text>
    </g>

    <g v-if="ilsFluctuation" data-effect="ils-fluctuation">
      <path :d="ilsWave" fill="none" stroke="#f3ca85" stroke-width="2.2" />
      <rect x="50" y="138" width="270" height="25" rx="4" fill="#403324" stroke="#ad8755" stroke-width="0.7" />
      <text x="185" y="154" text-anchor="middle" fill="#f5d699" font-size="11" letter-spacing="1">ILS SIGNAL FLUCTUATION · 21R</text>
    </g>

    <circle :cx="RADAR.originX" :cy="RADAR.originY" r="4.2" fill="#a5f2d9" stroke="#0d2530" stroke-width="1.2" data-ring-origin="21R" />
    <text x="1017" y="188" fill="#719795" font-size="9" letter-spacing="0.8">21R THRESHOLD · RING ORIGIN</text>
    <g v-for="ring in RANGE_RINGS" :key="`label-${ring.nm}`">
      <rect :x="ringLabelX(ring) - 23" :y="labelY - 11" width="47" height="17" rx="3" fill="#102331" />
      <text :x="ringLabelX(ring)" :y="labelY + 1" text-anchor="middle" fill="#a0bacb" font-size="10" font-family="Consolas,monospace">{{ ring.nm }} NM</text>
    </g>

    <g v-for="aircraft in targets" :key="aircraft.id" :data-aircraft="aircraft.callsign" data-display="radar" :data-kind="aircraft.kind" :data-x="aircraft.radar.x" :data-y="aircraft.radar.y" :data-phase="aircraft.phase" :data-offscreen="aircraft.outside || undefined">
      <g :transform="`translate(${aircraft.x} ${aircraft.y})`">
        <circle r="8" :fill="aircraft.color" opacity="0.12" />
        <circle r="4.2" :fill="aircraft.outside ? '#102331' : aircraft.color" :stroke="aircraft.color" stroke-width="1.3" />
        <path :transform="`rotate(${aircraft.heading})`" d="M 7 0 H 19 M 15 -3 L 19 0 L 15 3" fill="none" :stroke="aircraft.color" stroke-width="1.5" />
      </g>
      <g v-if="showLabels" data-aircraft-label="radar">
        <path :d="aircraft.leader" :stroke="aircraft.color" stroke-width="0.75" opacity="0.8" fill="none" />
        <rect :x="aircraft.labelX" :y="aircraft.labelTop" width="178" height="43" rx="4" fill="#122c35" :stroke="aircraft.color" stroke-opacity="0.55" stroke-width="0.75" />
        <text :x="aircraft.labelX + 8" :y="aircraft.labelTop + 13" font-size="11" font-weight="600" :fill="aircraft.color">{{ aircraft.callsign }} · {{ aircraft.type }} <tspan font-weight="400" fill="#9eb5bd">{{ aircraft.wtc }}</tspan></text>
        <text :x="aircraft.labelX + 8" :y="aircraft.labelTop + 26" font-size="10" fill="#c1d1d7">{{ aircraft.kind === 'departure' ? `HDG ${headingLabel(aircraft)}` : distanceLabel(aircraft) }} · {{ aircraft.speedKnots ?? '—' }} KT · {{ aircraft.runway }}</text>
        <text :x="aircraft.labelX + 8" :y="aircraft.labelTop + 37" font-size="8.5" fill="#90acb7">{{ aircraft.outside ? 'CONTINUING BEYOND RADAR VIEW' : aircraft.phase }}</text>
      </g>
    </g>

    <rect x="12" y="9" width="364" height="24" rx="3" fill="#102331" opacity="0.96" />
    <circle cx="26" cy="21" r="3" fill="#8bcbbb" />
    <text x="39" y="25" fill="#bad0dd" font-size="11" letter-spacing="1.8">AIRPORT SITUATION DISPLAY</text>
    <rect x="1350" y="9" width="430" height="24" rx="3" fill="#102331" opacity="0.96" />
    <text x="1766" y="25" text-anchor="end" fill="#86a4b8" font-size="10" letter-spacing="1">5 NM RINGS · INDEPENDENT RADAR SCALE</text>
    <rect x="0.5" y="0.5" :width="RADAR.width - 1" :height="RADAR.height - 1" rx="5" fill="none" stroke="#2b4658" />
  </svg>
</template>
