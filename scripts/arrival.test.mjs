import test from 'node:test'
import assert from 'node:assert/strict'
import {getArrivalState,createArrival} from '../src/data/arrival.js'
import {RADAR,RADAR_RUNWAYS,localizerGeometry,chartToRadar,runwayGeometry} from '../src/data/radar.js'
test('runway pair is centered and localizers reverse with exact 15 NM length',()=>{
 const g=runwayGeometry(RADAR_RUNWAYS[0]); assert.equal((g.start.x+g.end.x)/2,RADAR.width/2)
 const upper=runwayGeometry(RADAR_RUNWAYS[1]);assert.equal((g.start.y+upper.start.y)/2,RADAR.height/2)
 for(const dir of ['21','03'])for(const r of RADAR_RUNWAYS){const l=localizerGeometry(r,dir);assert.ok(Math.abs(Math.abs(l.courseEnd.x-l.activeThreshold.x)-15*RADAR.pixelsPerNm)<1e-9);assert.equal(Math.sign(l.courseEnd.x-l.activeThreshold.x),dir==='21'?-1:1)}
})
for(const dir of ['21','03']){
 test(`${dir}: shared aircraft state, 10 NM establishment and single display ownership`,()=>{
  for(let frame=0;frame<900;frame++){const s=getArrivalState(dir,frame/30);assert.deepEqual(s.radar,chartToRadar(s));assert.equal(s.display,frame<360?'radar':'ground');assert.ok(Number.isFinite(s.heading))}
  const established=getArrivalState(dir,4);assert.ok(Math.abs(established.distanceNm-10)<1e-10);assert.equal(established.y,589)
  const handoff=getArrivalState(dir,12);assert.equal(handoff.x,dir==='21'?10:1760)
  const before=getArrivalState(dir,12-1e-7);assert.ok(Math.abs(before.x-handoff.x)<.001)
  assert.equal(getArrivalState(dir,14).x,dir==='21'?381:1470)
  assert.equal(getArrivalState(dir,16).phase,'Touchdown')
  assert.ok(getArrivalState(dir,29).y>630)
  const again=getArrivalState(dir,7.5);getArrivalState(dir,28);assert.deepEqual(getArrivalState(dir,7.5),again)
  const points=createArrival(dir).waypoints;points.slice(1).forEach((p,i)=>assert.ok(p.t>points[i].t))
 })
}
