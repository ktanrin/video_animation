<script setup>
import { computed } from 'vue'
import RadarLayout from './RadarLayout.vue'
import { PANELS } from '../data/radar.js'
import presentationMap from '../assets/airport/vtbd-presentation.svg'
import chartMap from '../assets/airport/vtbd-chart.svg'
import { createArrival, getArrivalState, arrivalRoute } from '../data/arrival.js'
import { DEPARTURE, HOTSPOTS, getAircraftState, routePath } from '../data/scenario.js'
const props = defineProps({ direction:{type:String,default:'21'}, movement:{type:String,default:'arrival'}, frame: {type:Number,default:0}, fps: {type:Number,default:30}, mode:{type:String,default:'presentation'}, zoom:{type:Number,default:1}, showAircraft:{type:Boolean,default:true}, showRoute:{type:Boolean,default:true}, showLabels:{type:Boolean,default:true}, showHotspots:{type:Boolean,default:false} })
const flight = computed(()=>props.movement==='arrival'?createArrival(props.direction):DEPARTURE)
const state = computed(() => props.movement==='arrival'?getArrivalState(props.direction,props.frame/props.fps):getAircraftState(DEPARTURE, props.frame / props.fps))
const displayedRoute = computed(()=>props.movement==='arrival'?arrivalRoute(props.direction):routePath)
const groundVisible = computed(()=>props.showAircraft && (props.movement!=='arrival'||state.value.display==='ground'))
const time = computed(() => (props.frame / props.fps).toFixed(1).padStart(4,'0'))
const viewBox = computed(() => { const width=1750/props.zoom,height=610/props.zoom; return `${885-width/2} ${585-height/2} ${width} ${height}` })
const mapUrl = computed(() => props.mode === 'chart' ? chartMap : presentationMap)
</script>

<template>
  <svg class="airport-scene" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VTBD Don Mueang aerodrome ground movement layout">
    <defs>
      <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#183040" stroke-width="0.6" /></pattern>
      <linearGradient id="sceneBackground" x2="0.8" y2="1"><stop stop-color="#102332"/><stop offset="1" stop-color="#0a1824"/></linearGradient>
      <filter id="aircraftGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect width="1920" height="1080" fill="url(#sceneBackground)" />
    <rect width="1920" height="1080" fill="url(#mapGrid)" opacity="0.35" />
    <path d="M64 128H1856" stroke="#29404e" />
    <text x="76" y="40" fill="#7fe5c0" font-size="12" letter-spacing="3">AERODROME STUDY  /  01</text>
    <text x="70" y="101" fill="#ecf3f7" font-size="52" font-weight="600" letter-spacing="-2">VTBD</text>
    <text x="252" y="75" fill="#dce7ef" font-size="24">Don Mueang International</text>
    <text x="252" y="104" fill="#829bab" font-size="14" letter-spacing="2">BANGKOK, THAILAND</text>
    <g transform="translate(1408 44)"><text fill="#90a7b7" font-size="12" letter-spacing="2">RADAR + GROUND MOVEMENT</text><text y="33" fill="#dae7ef" font-size="20">03L / 21R <tspan fill="#536d7d">·</tspan> 03R / 21L</text><text y="59" fill="#7b94a4" font-size="13">Vector layout from supplied chart</text></g>
    <RadarLayout :direction="direction" :aircraft="movement==='arrival' && showAircraft && state.display==='radar' ? state : null" x="64" y="146" :width="PANELS.width" :height="PANELS.radarHeight" />
    <text x="78" y="366" fill="#7895a7" font-size="11" letter-spacing="1.8">AERODROME LAYOUT</text>
    <text x="1844" y="366" text-anchor="end" fill="#587483" font-size="10" letter-spacing="1.2">CHART ORIENTATION · 21 ENDS LEFT / 03 ENDS RIGHT</text>
    <svg x="64" y="374" :width="PANELS.width" :height="PANELS.aerodromeHeight" :viewBox="viewBox" overflow="hidden" data-panel="aerodrome">
      <rect x="-500" y="-500" width="3500" height="2500" :fill="mode === 'chart' ? '#fff' : '#0d1c29'" />
      <!-- Original paths and outlined labels remain in the SVG asset. -->
      <image :href="mapUrl" x="10" y="280" width="1750" height="610" />
      <g v-if="showLabels && mode === 'presentation'" font-family="Segoe UI,Arial,sans-serif">
        <g fill="#9fbbc7" font-size="13" letter-spacing="2"><text x="608" y="370" text-anchor="middle">RTAF APRON</text><text x="1104" y="376" text-anchor="middle">EAST APRON</text><text x="479" y="779" text-anchor="middle">NORTH APRON</text><text x="740" y="814" text-anchor="middle">PASSENGER TERMINALS</text><text x="1287" y="782" text-anchor="middle">SOUTH APRON · CARGO</text></g>
        <g font-size="13" fill="#d9e6ed" font-weight="600"><rect x="259" y="421" width="70" height="27" rx="5" fill="#243c4d"/><text x="294" y="440" text-anchor="middle">21L →</text><rect x="1332" y="441" width="66" height="25" rx="5" fill="#243c4d"/><text x="1365" y="458" text-anchor="middle">← 03R</text><rect x="266" y="553" width="70" height="27" rx="5" fill="#243c4d"/><text x="301" y="572" text-anchor="middle">21R →</text><rect x="1505" y="556" width="67" height="27" rx="5" fill="#243c4d"/><text x="1538" y="575" text-anchor="middle">← 03L</text></g>
      </g>
      <g v-if="showHotspots"><g v-for="spot in HOTSPOTS" :key="spot.id"><circle :cx="spot.x" :cy="spot.y" :r="spot.r" fill="#ffad8030" stroke="#ffad80" stroke-width="1.5"/><rect :x="spot.x-16" :y="spot.y-spot.r-18" width="32" height="15" rx="3" fill="#8f4931"/><text :x="spot.x" :y="spot.y-spot.r-7" text-anchor="middle" font-size="9" fill="#fff4e9">{{spot.id}}</text></g></g>
      <g v-if="showRoute" fill="none" stroke-linecap="round" stroke-linejoin="round"><path :d="displayedRoute" stroke="#7fe5c0" stroke-width="6" opacity="0.07"/><path :d="displayedRoute" stroke="#7fe5c0" stroke-width="1.6" stroke-dasharray="4 5" opacity="0.65"/><circle v-if="movement==='departure'" cx="717" cy="694" r="5" fill="#0d1c29" stroke="#7fe5c0" stroke-width="1.5" /></g>
      <g v-if="groundVisible" :transform="`translate(${state.x} ${state.y})`" :data-aircraft="flight.callsign" :data-x="state.x" :data-y="state.y">
        <circle r="11" fill="#7fe5c0" opacity="0.18" filter="url(#aircraftGlow)"/>
        <g :transform="`rotate(${state.heading})`"><path d="M11 0L7-2L1-2L-5-10L-8-10L-4-2L-8-2L-11-5L-13-5L-11 0L-13 5L-11 5L-8 2L-4 2L-8 10L-5 10L1 2L7 2Z" fill="#97f4d0" stroke="#0d1c29" stroke-width="0.7"/></g>
        <path d="M4-7L20-31H37" stroke="#7fe5c0" stroke-width="0.8" fill="none"/>
        <rect x="20" y="-58" width="117" height="33" rx="4" fill="#142f36" stroke="#3c7467" stroke-width="0.7"/>
        <text x="27" y="-44" fill="#a4f0d4" font-size="10" font-weight="700">{{flight.callsign}} <tspan font-weight="400" fill="#94bbae">{{flight.type}}</tspan></text>
        <text x="27" y="-31" fill="#97b4b5" font-size="8">{{state.phase}}</text>
      </g>
    </svg>
    <path d="M64 995H1856" stroke="#29404e" />
    <g transform="translate(78 1030)"><circle r="5" fill="#7fe5c0"/><text x="19" y="5" fill="#a6becb" font-size="16">{{ showAircraft ? state.phase : 'Aerodrome layout' }}</text><text x="510" y="5" fill="#587b8e" font-size="13" letter-spacing="1.4">{{ showAircraft ? 'ILLUSTRATIVE MOVEMENT · COMPRESSED TIMING' : 'VTBD GROUND MOVEMENT CHART' }}</text></g>
    <text x="1846" y="1035" text-anchor="end" fill="#a7c1cf" font-size="19" font-family="Consolas,monospace">{{time}} <tspan fill="#587b8e" font-size="14">/ 30.0 SEC</tspan></text>
    <text x="78" y="1065" fill="#587080" font-size="11">SOURCE: SUPPLIED VTBD AERODROME GROUND MOVEMENT CHART · CAAT</text>
  </svg>
</template>
<style scoped>
.airport-scene { display:block; width:100%; height:100%; font-family:'Segoe UI',Arial,sans-serif; }
</style>
