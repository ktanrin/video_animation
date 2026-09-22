import test from 'node:test'
import assert from 'node:assert/strict'
import { DEPARTURE, getAircraftState, VIDEO } from '../src/data/scenario.js'
import { PANELS, RADAR, RADAR_RUNWAYS, RANGE_RINGS, runwayGeometry } from '../src/data/radar.js'
test('every video frame has valid coordinates and heading',()=>{
  for(let frame=0;frame<VIDEO.durationInFrames;frame++){
    const s=getAircraftState(DEPARTURE,frame/VIDEO.fps)
    for(const key of ['x','y','heading'])assert.ok(Number.isFinite(s[key]),`${key} at ${frame}`)
    assert.ok(s.x>=0&&s.x<=1800&&s.y>=280&&s.y<=890)
  }
})
test('holding position stays fixed for the full hold',()=>{
  const a=getAircraftState(DEPARTURE,13)
  for(const t of [13.5,14,15,16.99]){const b=getAircraftState(DEPARTURE,t);assert.equal(a.x,b.x);assert.equal(a.y,b.y)}
})
test('scrubbing out of order reproduces the same position',()=>{
  const a=getAircraftState(DEPARTURE,8.25);getAircraftState(DEPARTURE,27);getAircraftState(DEPARTURE,0)
  assert.deepEqual(getAircraftState(DEPARTURE,8.25),a)
})
test('timestamps are strictly increasing',()=>DEPARTURE.waypoints.slice(1).forEach((p,i)=>assert.ok(p.t>DEPARTURE.waypoints[i].t)))
test('radar panel is exactly one third of the aerodrome panel height',()=>{
  assert.equal(PANELS.radarHeight*3,PANELS.aerodromeHeight)
})
test('range rings increase by 5 NM and are centered on the 21R threshold',()=>{
  const origin=runwayGeometry(RADAR_RUNWAYS.find(r=>r.id==='21R')).threshold
  assert.deepEqual(origin,{x:RADAR.originX,y:RADAR.originY})
  assert.deepEqual(RANGE_RINGS.map(r=>r.nm),[5,10,15,20,25,30,35])
  RANGE_RINGS.forEach((ring,i)=>{
    assert.equal(ring.radius/RADAR.pixelsPerNm,ring.nm)
    assert.equal(ring.radius-(i?RANGE_RINGS[i-1].radius:0),5*RADAR.pixelsPerNm)
  })
})
test('two radar runways preserve lengths and parallel alignment on the NM scale',()=>{
  assert.equal(RADAR_RUNWAYS.length,2)
  for(const runway of RADAR_RUNWAYS){
    const g=runwayGeometry(runway)
    assert.equal(g.start.y,g.end.y)
    assert.ok(Math.abs((g.end.x-g.start.x)/RADAR.pixelsPerNm*1852-runway.lengthM)<1e-8)
    assert.ok(Math.abs((g.threshold.x-g.start.x)/RADAR.pixelsPerNm*1852-runway.displacedThresholdM)<1e-8)
  }
})
