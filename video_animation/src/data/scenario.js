// All route coordinates use the 1800-wide landscape chart coordinate system.
export const VIDEO = Object.freeze({ width: 1920, height: 1080, fps: 30, durationInFrames: 900 })

export const DEPARTURE = {
  callsign: 'DEMO 01', type: 'A320', color: '#7fe5c0', stand: '35', runway: '21R',
  // Educational example with compressed times. Review before use as a procedure.
  waypoints: [
    { t: 0, x: 717, y: 694, heading: 0, phase: 'At stand 35' },
    { t: 2, x: 717, y: 694, heading: 0, phase: 'Pushback' },
    { t: 4, x: 691, y: 694, heading: 0, phase: 'Pushback' },
    { t: 5, x: 691, y: 684, heading: -90, phase: 'Taxi via H' },
    { t: 6, x: 691, y: 656, phase: 'Taxi via H' },
    { t: 6.5, x: 682, y: 647, phase: 'Taxi via C' },
    { t: 10.5, x: 525, y: 647, phase: 'Taxi via C' },
    { t: 11, x: 515, y: 643, phase: 'Taxi via E' },
    { t: 11.5, x: 510, y: 634, phase: 'Taxi via E' },
    { t: 13, x: 510, y: 613, phase: 'Holding short' },
    { t: 17, x: 510, y: 613, phase: 'Line up' },
    { t: 19, x: 510, y: 602, phase: 'Line up' },
    { t: 20, x: 514, y: 593, phase: 'Line up' },
    { t: 21, x: 525, y: 589, phase: 'On runway 21R' },
    { t: 22, x: 539, y: 589, phase: 'Departure roll' },
    { t: 24, x: 690, y: 589, phase: 'Departure roll' },
    { t: 26, x: 1010, y: 589, phase: 'Departure roll' },
    { t: 28, x: 1450, y: 589, phase: 'Departing' },
    { t: 30, x: 1720, y: 589, phase: 'Departing' },
  ],
  events: [{time:0,label:'Stand 35 / pushback'},{time:5,label:'Taxi via H, C and E'},{time:13,label:'Hold short of 21R'},{time:17,label:'Line up'},{time:22,label:'Departure roll'}],
}

export function getAircraftState(flight, time) {
  const points = flight.waypoints
  const t = Math.max(points[0].t, Math.min(time, points.at(-1).t))
  let index = points.findIndex((p, i) => i < points.length - 1 && t >= p.t && t < points[i + 1].t)
  if (index < 0) index = points.length - 2
  const a = points[index], b = points[index + 1]
  const progress = (t - a.t) / (b.t - a.t)
  let heading = a.heading
  if (heading === undefined) {
    let target = b
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.001) target = points.slice(index + 1).find(p => Math.hypot(p.x-a.x,p.y-a.y) > 0.001) || b
    heading = Math.atan2(target.y - a.y, target.x - a.x) * 180 / Math.PI
  }
  return { x: a.x + (b.x-a.x)*progress, y: a.y + (b.y-a.y)*progress, heading, phase: a.phase }
}

export const routePath = DEPARTURE.waypoints.filter((p,i,a) => !i || p.x !== a[i-1].x || p.y !== a[i-1].y).map((p,i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
export const HOTSPOTS = [
  {id:'HS1',x:348,y:610,r:44}, {id:'HS2',x:516,y:641,r:41},
  {id:'HS3',x:988,y:646,r:44}, {id:'HS4',x:1187,y:644,r:43},
  {id:'HS5',x:1252,y:557,r:26}, {id:'HS6',x:1253,y:445,r:26},
]
