import {getAircraftState} from './scenario.js'
import {CHART_METRES_PER_UNIT, METRES_PER_NM, chartToRadar} from './radar.js'
// User-confirmed training targets; inclusive of clearing the runway holding line.
// These are operational annotations, independent of the compressed video clock.
export const HIRO_21R = Object.freeze({
  exits: Object.freeze({R:70, O:60}),
  label: '21R AROT TARGETS: TWY R 70 s / TWY O 60 s',
  explanation: 'Both include the aircraft fully beyond the holding line. No extra 10 s.',
})
const unitsPerNm=METRES_PER_NM/CHART_METRES_PER_UNIT
export const ARRIVAL_EVENTS=[{time:0,label:'Arrival · 15 NM'},{time:4,label:'Established · 10 NM'},{time:12,label:'Transfer to ground'},{time:16,label:'Touchdown'},{time:24,label:'Vacate runway'}]
export function createArrival(direction='21') {
  const reverse=direction==='03', threshold=reverse?1470:381, side=reverse?1:-1
  const edge=reverse?1760:10
  const points=[
    {t:0,x:threshold+side*15*unitsPerNm,y:589+0.8*unitsPerNm,phase:'Intercepting localizer'},
    {t:4,x:threshold+side*10*unitsPerNm,y:589,phase:'Established · 10 NM'},
    {t:12,x:edge,y:589,phase:'Short final'},
    {t:14,x:threshold,y:589,phase:'Over threshold'},
    {t:16,x:reverse?1310:541,y:589,phase:'Touchdown'},
    {t:22,x:reverse?590:1110,y:589,phase:'Landing roll'},
    {t:24,x:reverse?525:1190,y:589,phase:'Vacating runway'},
    {t:25,x:reverse?514:1210,y:593,phase:'Vacating runway'},
    {t:26,x:reverse?510:1234,y:607,phase:'Vacating runway'},
    {t:27,x:reverse?510:1255,y:634,phase:'Vacating runway'},
    {t:28,x:reverse?515:1260,y:643,phase:'Runway vacated'},
    {t:29,x:reverse?525:1250,y:647,phase:'Taxi on C'},
    {t:30,x:reverse?560:1220,y:647,phase:'Taxi on C'},
  ]
  return {callsign:'ARR 01',type:'A320',runway:reverse?'03L':'21R',waypoints:points,events:ARRIVAL_EVENTS}
}
export function getArrivalState(direction,time) {
  const flight=createArrival(direction)
  const state=getAircraftState(flight,time)
  const threshold=direction==='03'?1470:381
  return {...state, ...flight, radar:chartToRadar(state),
    distanceNm:Math.abs(state.x-threshold)/unitsPerNm,
    display:time<12?'radar':'ground'}
}
export function arrivalRoute(direction) {
  return createArrival(direction).waypoints.filter(p=>p.t>=12).map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')
}
