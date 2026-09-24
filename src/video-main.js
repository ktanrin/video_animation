// Pellicule's supported existing-server integration, served by this project's Vite.
import { createApp, ref, nextTick } from 'vue'
import { FRAME_KEY, CONFIG_KEY } from 'pellicule'
import { waitForRenderReady } from 'pellicule/runtime/ready'
import { setupPreviewOverlay } from 'pellicule/runtime/preview'
import Video from '../Video.vue'
import { getScenario } from './data/hiro.js'
const params = new URLSearchParams(location.search)
const scenario = getScenario(params.get('scenario') || 'segregated', params.get('direction') || '21')
const fps = Number(params.get('fps') || 30)
const requestedSpeed = Number(params.get('speed') || 1)
const playbackSpeed = [.5, 1, 2, 4, 8].includes(requestedSpeed) ? requestedSpeed : 1
const config = {fps,durationInFrames:Number(params.get('duration') || Math.ceil(scenario.duration * fps / playbackSpeed) + 1),width:Number(params.get('width')||1920),height:Number(params.get('height')||1080)}
const preview=params.get('preview')==='1'
const frame=ref(0)
const canvas=document.getElementById('pellicule-canvas')
Object.assign(canvas.style,{width:`${config.width}px`,height:`${config.height}px`,transformOrigin:'top left'})
Object.assign(document.documentElement.style,{margin:'0',width:'100%',height:'100%',background:'#0d1c29'})
Object.assign(document.body.style,{margin:'0',width:'100%',height:'100%',overflow:'hidden'})
document.getElementById('app').style.height='100%'
function fit(){
  if(!preview)return
  const scale=Math.min(innerWidth/config.width,(innerHeight-76)/config.height)
  Object.assign(canvas.style,{transform:`scale(${scale})`,position:'absolute',left:`${(innerWidth-config.width*scale)/2}px`,top:`${(innerHeight-76-config.height*scale)/2}px`})
}
window.__PELLICULE_SET_FRAME__=async value=>{frame.value=value;await nextTick();await waitForRenderReady()}
try{
  const app=createApp(Video)
  app.provide(FRAME_KEY,frame)
  app.provide(CONFIG_KEY,config)
  app.mount('#app')
  await nextTick()
  // SVG <image> elements aren't covered by HTMLImageElement readiness checks.
  await Promise.all([...document.querySelectorAll('svg image')].map(el=>new Promise((ok,no)=>{const image=new Image();image.onload=ok;image.onerror=()=>no(new Error('Could not load airport SVG'));image.src=el.getAttribute('href')})))
  await waitForRenderReady()
  if(preview){fit();window.addEventListener('resize',fit);setupPreviewOverlay({version:'0.3.0',setFrame:window.__PELLICULE_SET_FRAME__})}
  window.__PELLICULE_READY__=true
}catch(error){window.__PELLICULE_ERROR__=error.message;window.__PELLICULE_READY__=true;console.error(error)}
