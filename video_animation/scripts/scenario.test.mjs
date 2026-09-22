import test from 'node:test'
import assert from 'node:assert/strict'
import { DEPARTURE, getAircraftState, VIDEO } from '../src/data/scenario.js'
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
