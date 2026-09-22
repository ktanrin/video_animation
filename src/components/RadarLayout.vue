<script setup>
import { computed } from 'vue'
import { RADAR, RADAR_RUNWAYS, RANGE_RINGS, localizerGeometry } from '../data/radar.js'

const props=defineProps({direction:{type:String,default:'21'},aircraft:{type:Object,default:null}})
const runways = computed(()=>RADAR_RUNWAYS.map(runway => ({ ...runway, ...localizerGeometry(runway,props.direction) })))
const ticks = Array.from({ length: RADAR.localizerLengthNm }, (_, i) => i + 1)
const labelY = RADAR.height - 24
// Put each distance label on the left-hand arc of its actual circle.
const ringLabelX = ring => RADAR.originX - Math.sqrt(ring.radius ** 2 - (labelY - RADAR.originY) ** 2)
</script>

<template>
  <svg
    :viewBox="`0 0 ${RADAR.width} ${RADAR.height}`"
    xmlns="http://www.w3.org/2000/svg"
    overflow="hidden"
    role="img"
    aria-label="Surveillance radar: two runways and localizer course guides, with range rings every 5 nautical miles centered at threshold 21R"
    data-panel="radar"
  >
    <title>VTBD surveillance radar layout</title>
    <desc>Independent radar scale. Rings: 5, 10, 15, 20, 25, 30 and 35 nautical miles from the 21R threshold. Parallel localizer course guides extend toward the approach side of both runways.</desc>
    <rect :width="RADAR.width" :height="RADAR.height" rx="5" fill="#102331" />

    <g data-layer="range-rings" fill="none" stroke="#658294" stroke-width="1" opacity="0.65">
      <circle
        v-for="ring in RANGE_RINGS" :key="ring.nm"
        :cx="RADAR.originX" :cy="RADAR.originY" :r="ring.radius"
        :data-radius-nm="ring.nm"
      />
    </g>

    <g v-for="runway in runways" :key="runway.id" :data-runway="runway.id">
      <!-- Each localizer line is aligned with its own threshold and axis. -->
      <g :stroke="runway.color" fill="none" opacity="0.8">
        <path
          :d="`M ${runway.courseEnd.x} ${runway.activeThreshold.y} H ${runway.activeThreshold.x}`"
          stroke-width="1.05"
          :data-localizer="runway.activeId"
        />
        <path
          v-for="nm in ticks" :key="nm"
          :d="`M ${runway.activeThreshold.x + runway.side * nm * RADAR.pixelsPerNm} ${runway.activeThreshold.y} v ${runway.labelSide * (nm % 5 === 0 ? 8 : 3.5)}`"
          :stroke-width="nm % 5 === 0 ? 1.15 : 0.75"
        />
      </g>

      <!-- Lengths and offsets share the NM scale; widths are emphasized for visibility. -->
      <path :d="`M ${runway.start.x} ${runway.start.y} H ${runway.end.x}`" stroke="#e1edf3" stroke-width="3.1" />
      <path
        :d="`M ${runway.threshold.x} ${runway.threshold.y - 3.5} v 7 M ${runway.end.x} ${runway.end.y - 3.5} v 7`"
        stroke="#f0f7fa" stroke-width="1.15" fill="none"
      />
      <path
        :d="`M ${runway.threshold.x - 10} ${runway.threshold.y + runway.labelSide * 31} L ${runway.threshold.x} ${runway.threshold.y + runway.labelSide * 5}`"
        :stroke="runway.color" stroke-width="0.7" opacity="0.7" fill="none"
      />
      <text :x="runway.threshold.x - 10" :y="runway.threshold.y + runway.labelSide * 40 + 4" text-anchor="middle" :fill="runway.color" font-size="13" font-weight="600">{{ runway.id }}</text>
      <path
        :d="`M ${runway.end.x + 14} ${runway.end.y + runway.labelSide * 31} L ${runway.end.x} ${runway.end.y + runway.labelSide * 5}`"
        :stroke="runway.color" stroke-width="0.7" opacity="0.7" fill="none"
      />
      <text :x="runway.end.x + 16" :y="runway.end.y + runway.labelSide * 40 + 4" text-anchor="middle" :fill="runway.color" font-size="13" font-weight="600">{{ runway.opposite }}</text>

      <text :x="runway.courseEnd.x - 25" :y="runway.labelSide<0?48:155" :fill="runway.color" font-size="11" letter-spacing="1.2">LOC {{ runway.activeId }} · 15 NM</text>

    </g>

    <g v-if="aircraft" :transform="`translate(${aircraft.radar.x} ${aircraft.radar.y})`" :data-aircraft="aircraft.callsign" data-display="radar">
      <circle r="5" fill="#97f4d0" />
      <path :transform="`rotate(${aircraft.heading})`" d="M 5 0 H 18 M 14 -3 L 18 0 L 14 3" fill="none" stroke="#97f4d0" stroke-width="1.5"/>
      <path d="M 0 -7 L 18 -34 H 34" stroke="#97f4d0" fill="none"/>
      <rect x="18" y="-67" width="175" height="34" rx="4" fill="#142f36" stroke="#3c7467"/>
      <text x="25" y="-53" font-size="12" fill="#a4f0d4">{{aircraft.callsign}} · {{aircraft.type}} · {{aircraft.runway}}</text>
      <text x="25" y="-40" font-size="10" fill="#97b4b5">{{aircraft.distanceNm.toFixed(1)}} NM · {{aircraft.phase}}</text>
    </g>

    <circle :cx="RADAR.originX" :cy="RADAR.originY" r="4.2" fill="#a5f2d9" stroke="#0d2530" stroke-width="1.2" data-ring-origin="21R" />
    <path :d="`M ${RADAR.originX + 7} ${RADAR.originY + 10} L 1010 165 H 1235`" stroke="#6d9a98" stroke-width="0.7" fill="none" />
    <text x="1017" y="183" fill="#9ec5c5" font-size="10" letter-spacing="1.2">21R THRESHOLD · RING ORIGIN</text>

    <g v-for="ring in RANGE_RINGS" :key="`label-${ring.nm}`">
      <rect :x="ringLabelX(ring) - 25" :y="labelY - 11" width="51" height="17" rx="3" fill="#102331" />
      <text :x="ringLabelX(ring)" :y="labelY + 1" text-anchor="middle" fill="#a0bacb" font-size="11" font-family="Consolas,monospace">{{ ring.nm }} NM</text>
    </g>

    <rect x="12" y="9" width="406" height="26" rx="3" fill="#102331" opacity="0.96" />
    <circle cx="26" cy="22" r="3" fill="#8bcbbb" />
    <text x="39" y="26" fill="#bad0dd" font-size="12" letter-spacing="2">AIRPORT SITUATION DISPLAY</text>
    <rect x="1360" y="9" width="420" height="26" rx="3" fill="#102331" opacity="0.96" />
    <text x="1766" y="26" text-anchor="end" fill="#86a4b8" font-size="11" letter-spacing="1">5 NM RINGS · INDEPENDENT RADAR SCALE</text>
    <rect x="0.5" y="0.5" :width="RADAR.width - 1" :height="RADAR.height - 1" rx="5" fill="none" stroke="#2b4658" />
  </svg>
</template>
