<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AirportScene from './components/AirportScene.vue'
import { createArrival, getArrivalState } from './data/arrival.js'
import { VIDEO, DEPARTURE, getAircraftState } from './data/scenario.js'
const frame=ref(0),playing=ref(false),speed=ref(1),zoom=ref(1),mode=ref('presentation')
const showAircraft=ref(true),showRoute=ref(true),showLabels=ref(true),showHotspots=ref(false)
const panel=ref('layout'),exporting=ref(false)
const direction=ref('21'),movement=ref('arrival')
watch([direction,movement],()=>{restart();zoom.value=1;if(movement.value==='departure')direction.value='21'})
const flight=computed(()=>movement.value==='arrival'?createArrival(direction.value):DEPARTURE)
const seconds=computed(()=>frame.value/VIDEO.fps)
const state=computed(()=>movement.value==='arrival'?getArrivalState(direction.value,seconds.value):getAircraftState(DEPARTURE,seconds.value))
const clock=computed(()=>`00:${String(Math.floor(seconds.value)).padStart(2,'0')}.${String(frame.value%VIDEO.fps).padStart(2,'0')}`)
let animationId,lastTime=null,fraction=0
function tick(now){
  if(playing.value&&lastTime!==null){
    fraction+=(now-lastTime)/1000*VIDEO.fps*speed.value
    const count=Math.floor(fraction);fraction-=count
    frame.value=Math.min(VIDEO.durationInFrames-1,frame.value+count)
    if(frame.value>=VIDEO.durationInFrames-1)playing.value=false
  }
  lastTime=now;animationId=requestAnimationFrame(tick)
}
function togglePlay(){if(!playing.value&&frame.value>=VIDEO.durationInFrames-1)frame.value=0;playing.value=!playing.value;fraction=0;lastTime=null}
function restart(){frame.value=0;fraction=0;playing.value=false}
function seek(event){frame.value=Number(event.target.value);fraction=0}
function keydown(event){
  if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(event.target.tagName))return
  if(event.code==='Space'){event.preventDefault();togglePlay()}
  if(event.code==='ArrowRight'){event.preventDefault();playing.value=false;frame.value=Math.min(VIDEO.durationInFrames-1,frame.value+1)}
  if(event.code==='ArrowLeft'){event.preventDefault();playing.value=false;frame.value=Math.max(0,frame.value-1)}
}
onMounted(()=>{animationId=requestAnimationFrame(tick);window.addEventListener('keydown',keydown)})
onUnmounted(()=>{cancelAnimationFrame(animationId);window.removeEventListener('keydown',keydown)})
</script>

<template>
  <div class="studio">
    <header class="app-header">
      <a class="brand" href="#" @click.prevent="restart"><span class="brand-mark">↗</span><span>GROUND<span class="brand-light">FRAME</span><small>VTBD · MOVEMENT STUDIO</small></span></a>
      <div class="project-name"><span class="status-dot"></span>Don Mueang International<span class="project-tag">LOCAL PROJECT</span></div>
      <button class="export-button" @click="exporting=true">Export video <span>↗</span></button>
    </header>
    <main class="workspace">
      <section class="main-column">
        <div class="workspace-heading"><div><p class="eyebrow">AERODROME / THAILAND</p><h1>Ground movement</h1></div><div class="view-switch" aria-label="Map appearance"><button :class="{active:mode==='presentation'}" @click="mode='presentation'">Presentation</button><button :class="{active:mode==='chart'}" @click="mode='chart'">Chart</button></div></div>
        <div class="preview-frame">
          <AirportScene :direction="direction" :movement="movement" :frame="frame" :fps="VIDEO.fps" :mode="mode" :zoom="zoom" :show-aircraft="showAircraft" :show-route="showRoute" :show-labels="showLabels" :show-hotspots="showHotspots" />
          <div class="map-tools" v-if="movement==='departure'"><button aria-label="Zoom out" :disabled="zoom<=1" @click="zoom=Math.max(1,zoom-.25)">−</button><button class="zoom-readout" @click="zoom=1" title="Fit entire airport">{{Math.round(zoom*100)}}%</button><button aria-label="Zoom in" :disabled="zoom>=2.5" @click="zoom=Math.min(2.5,zoom+.25)">+</button></div>
        </div>
        <section class="timeline" aria-label="Animation timeline">
          <div class="timeline-controls"><div class="transport"><button aria-label="Restart" class="restart" @click="restart">↺</button><button :aria-label="playing?'Pause':'Play'" class="play" @click="togglePlay">{{playing?'Ⅱ':'▶'}}</button><span class="timecode">{{clock}} <span>/ 00:30</span></span></div><div class="timeline-right"><label for="speed">Playback</label><select id="speed" v-model.number="speed"><option :value=".5">0.5×</option><option :value="1">1×</option><option :value="2">2×</option></select><span class="fps-label">30 FPS</span></div></div>
          <div class="ruler"><span v-for="n in 7" :key="n">{{String((n-1)*5).padStart(2,'0')}}s</span></div>
          <input class="scrubber" type="range" aria-label="Video frame" min="0" :max="VIDEO.durationInFrames-1" :value="frame" @input="seek" />
          <div class="track"><span class="track-label"><i></i>{{flight.callsign}}</span><div class="track-segments"><button v-for="(event,index) in flight.events" :key="event.time" @click="frame=event.time*VIDEO.fps" :style="{flex:(flight.events[index+1]?.time||30)-event.time}">{{event.label}}</button></div></div>
        </section>
        <footer class="workspace-footer"><span><span class="status-dot"></span>SVG layout from your ground movement chart</span><span>SPACE play / pause <b>·</b> ← → step frame</span></footer>
      </section>
      <aside class="inspector">
        <div class="inspector-section"><p class="eyebrow">MOVEMENT & RUNWAY IN USE</p><label for="movement">Scenario</label><select id="movement" v-model="movement" style="width:100%;margin:8px 0 16px"><option value="arrival">Linked arrival · radar → ground</option><option value="departure">Departure · original demo</option></select><label for="direction">Runway direction</label><select id="direction" v-model="direction" :disabled="movement==='departure'" style="width:100%;margin-top:8px"><option value="21">21 · approach from left</option><option value="03">03 · approach from right</option></select><p class="source-note">LOC 15 NM · Established at 10 NM<br>One aircraft, shared radar and ground timeline.</p></div>
        <div class="inspector-tabs"><button :class="{active:panel==='layout'}" @click="panel='layout'">Layout</button><button :class="{active:panel==='scenario'}" @click="panel='scenario'">Scenario</button></div>
        <template v-if="panel==='layout'">
          <div class="inspector-section"><p class="eyebrow">AIRPORT OVERVIEW</p><div class="airport-code">VTBD <span>DMK</span></div><p class="muted">Don Mueang International<br>Bangkok, Thailand</p><div class="mini-stats"><div><b>02</b><span>Runways</span></div><div><b>06</b><span>Hot spots</span></div></div></div>
          <div class="inspector-section"><p class="eyebrow">RUNWAY CONFIGURATION</p><div class="runway-card"><span class="runway-icon">Ⅱ</span><div><b>03L / 21R</b><small>3,700 × 60 m</small></div><span class="runway-tag">WEST</span></div><div class="runway-card"><span class="runway-icon">Ⅱ</span><div><b>03R / 21L</b><small>3,500 × 45 m</small></div><span class="runway-tag">EAST</span></div></div>
          <div class="inspector-section"><p class="eyebrow">VISIBLE LAYERS</p><label class="toggle-row"><span>Area labels</span><input type="checkbox" v-model="showLabels" /><span class="switch"></span></label><label class="toggle-row"><span>Chart hot spots</span><input type="checkbox" v-model="showHotspots" /><span class="switch"></span></label><label class="toggle-row"><span>Demo aircraft</span><input type="checkbox" v-model="showAircraft" /><span class="switch"></span></label><label class="toggle-row"><span>Demo route</span><input type="checkbox" v-model="showRoute" /><span class="switch"></span></label></div>
          <div class="inspector-section source-section"><p class="eyebrow">REFERENCE</p><a href="/reference/AD%20GND%20Chart.pdf" target="_blank" rel="noopener"><span class="pdf-icon">PDF</span><span>VTBD ground movement chart<small>Supplied source document</small></span><b>↗</b></a><p class="source-note">Chart geometry is preserved as vector artwork. Presentation colors are restyled.</p></div>
        </template>
        <template v-else>
          <div class="inspector-section"><p class="eyebrow">ILLUSTRATIVE {{movement.toUpperCase()}}</p><div class="airport-code">{{flight.callsign}}</div><p class="muted">A320 · {{movement==='arrival'?'Arrival to':'Stand 35 →'}} runway {{flight.runway}}</p><div class="phase-badge">{{state.phase}}</div><p class="source-note">Timing is compressed for presentation. The sample route is editable and is not an operational clearance.</p></div>
          <div class="inspector-section"><p class="eyebrow">SEQUENCE</p><button class="event-row" v-for="event in flight.events" :key="event.time" @click="frame=event.time*VIDEO.fps"><span>{{String(event.time).padStart(2,'0')}}s</span><b>{{event.label}}</b><i>↗</i></button></div>
          <div class="inspector-section"><p class="eyebrow">MAKE IT YOURS</p><p class="source-note">Edit callsign, route points, timing, and captions in <code>src/data/scenario.js</code>. The same Vue scene powers this preview and the video export.</p></div>
        </template>
        <div class="inspector-bottom"><span class="status-dot"></span>1920 × 1080 <span>30 FPS · 30 SEC</span></div>
      </aside>
    </main>
    <div v-if="exporting" class="modal-backdrop" @click.self="exporting=false"><section role="dialog" aria-modal="true" aria-labelledby="export-title" class="export-dialog"><button class="close" aria-label="Close export instructions" @click="exporting=false">×</button><p class="eyebrow">PELLICULE VIDEO EXPORT</p><h2 id="export-title">Render your presentation</h2><p>Run this in the project folder to create a 30-second Full HD video:</p><pre>npm.cmd run video:render -- --direction={{direction}} --movement={{movement}}</pre><p>The MP4 will be saved to <code>renders/vtbd-{{movement}}-{{direction}}.mp4</code>.</p><div class="export-detail"><b>Quick 3-second check</b><code>npm.cmd run video:sample</code></div><p class="source-note">The command above exports the selected scenario and runway direction. Browser zoom and layer changes are preview controls; edit <code>Video.vue</code> to change the exported layers.</p><button class="export-button" @click="exporting=false">Got it</button></section></div>
  </div>
</template>
