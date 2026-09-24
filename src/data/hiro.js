import { CHART_METRES_PER_UNIT, METRES_PER_NM, RADAR_RUNWAYS, chartToRadar } from './radar.js'

// Scenario clocks are real seconds. Playback speed only changes how fast the UI
// advances this clock; every position can be reconstructed directly by scrubbing.
export const AIRCRAFT_COLORS = Object.freeze({ arrival: '#7fe5c0', departure: '#f3d98b', wet: '#70b8ed' })
export const APPROACH_SPEEDS = Object.freeze({ established: 180, final: 150, slowAtNm: 5 })
const UNITS_PER_NM = METRES_PER_NM / CHART_METRES_PER_UNIT
const APPROACH_SPEED = APPROACH_SPEEDS.established / 3600
const FINAL_SPEED = APPROACH_SPEEDS.final / 3600
const CLIMB_SPEED = 180 / 3600
const TURN_RADIUS_NM = 0.4
const TURN_EXIT_NM = 0.6
const DEG = Math.PI / 180
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const headingMagnetic = heading => ((210 + heading) % 360 + 360) % 360
const path = points => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')

export const SCENARIOS = Object.freeze([
  { id: 'segregated', label: 'Scenario 1 Segregated', name: 'Segregated ARR/DEP', directions: ['21', '03'] },
  { id: 'mixed', label: 'Scenario 2 Mixed', name: 'Mixed A/D/A', directions: ['21', '03'] },
  { id: 'crossing', label: 'Scenario 3 Crossing & Rolling within 2nm', name: 'Crossing & rolling within 2 NM', directions: ['21'] },
  { id: 'unroutine', label: 'Scenario 4 Un-routine', name: 'Un-routine · wet runway', directions: ['21'] },
].map(scenario => Object.freeze({ ...scenario, directions: Object.freeze(scenario.directions) })))

// Distances are measured along the localizer to the active threshold. Aircraft
// establish at 180 kt and reduce to 150 kt from 5 NM, as specified by the user.
export function approachDuration(distanceNm) {
  const distance = Math.max(0, distanceNm)
  return Math.max(0, distance - 5) / APPROACH_SPEED + Math.min(5, distance) / FINAL_SPEED
}

export function approachDistance(initialDistanceNm, time) {
  const t = Math.max(0, time)
  const fastTime = Math.max(0, initialDistanceNm - 5) / APPROACH_SPEED
  return t < fastTime
    ? initialDistanceNm - t * APPROACH_SPEED
    : Math.max(0, Math.min(initialDistanceNm, 5) - (t - fastTime) * FINAL_SPEED)
}

function runwayInfo(runway) {
  const model = RADAR_RUNWAYS.find(candidate => candidate.id === runway || candidate.opposite === runway)
  const reverse = runway.startsWith('03')
  const threshold21 = { x: 381 + model.threshold.x * UNITS_PER_NM, y: 589 + model.threshold.y * UNITS_PER_NM }
  const start = { x: threshold21.x - model.displacedThresholdM / CHART_METRES_PER_UNIT, y: threshold21.y }
  const end = { x: threshold21.x + (model.lengthM - model.displacedThresholdM) / CHART_METRES_PER_UNIT, y: threshold21.y }
  return { runway, reverse, sign: reverse ? -1 : 1, heading: reverse ? 180 : 0,
    threshold: reverse ? end : threshold21, departureEnd: reverse ? start : end }
}

// Approximate centerlines from the supplied chart. These connectors are distinct:
// O is near x1000, R near x1190, F near x640; S is the x1253 crossing.
const EXITS = Object.freeze({
  O: [{ x: 910, y: 589 }, { x: 936, y: 597 }, { x: 980, y: 625 }, { x: 1024, y: 647 }, { x: 1050, y: 647 }],
  R: [{ x: 1095, y: 589 }, { x: 1120, y: 594 }, { x: 1170, y: 621 }, { x: 1220, y: 647 }, { x: 1240, y: 647 }],
  F: [{ x: 750, y: 589 }, { x: 720, y: 595 }, { x: 680, y: 617 }, { x: 625, y: 647 }, { x: 605, y: 647 }],
})
const EXIT_HOLDING_LINES = Object.freeze({ O: { x: 996, y: 634 }, R: { x: 1189, y: 634 }, F: { x: 662, y: 633 } })

function interpolate(points, time) {
  const t = clamp(time, points[0].t, points.at(-1).t)
  let index = points.findIndex((p, i) => i < points.length - 1 && t >= p.t && t < points[i + 1].t)
  if (index < 0) index = points.length - 2
  const a = points[index], b = points[index + 1]
  const progress = (t - a.t) / (b.t - a.t)
  const moving = Math.hypot(b.x - a.x, b.y - a.y) > 1e-8
  const heading = moving ? Math.atan2(b.y - a.y, b.x - a.x) / DEG : a.heading ?? 0
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress, heading }
}

function arrival(id, runway, initialDistanceNm, taxiway, occupancySeconds = 70, options = {}) {
  const geometry = runwayInfo(runway)
  const landingTime = approachDuration(initialDistanceNm)
  const exitStartTime = landingTime + (options.exitRollSeconds ?? occupancySeconds - 30)
  const clearTime = landingTime + occupancySeconds
  const exit = EXITS[taxiway]
  const groundPoints = [
    { t: landingTime, ...geometry.threshold },
    { t: landingTime + 7, x: geometry.threshold.x + geometry.sign * 150, y: geometry.threshold.y },
    { t: exitStartTime, ...exit[0] },
    { t: exitStartTime + 7, ...exit[1] },
    { t: exitStartTime + 17, ...exit[2] },
    // Endpoints include enough distance beyond the chart's diagonal holding
    // marks for the whole 26-unit aircraft footprint, rather than only its nose.
    { t: clearTime, ...exit[3] },
    { t: clearTime + 8, ...exit[4] },
    { t: clearTime + 15, x: exit[4].x + geometry.sign * 36, y: exit[4].y },
  ]
  // A blocked rapid exit never produces a runway-clear event. Stop before its
  // holding line and retain this position for the rest of the scenario.
  const stopTime = options.stuckOnExit ? exitStartTime + 17 : null
  const movementPoints = options.stuckOnExit ? groundPoints.slice(0, 5) : groundPoints
  return { id, callsign: `ARR ${id.slice(-2)}`, type: options.wtc === 'Heavy' ? 'B77W' : 'A320',
    wtc: options.wtc ?? 'Medium', kind: 'arrival', color: AIRCRAFT_COLORS.arrival,
    runway, initialDistanceNm, taxiway, occupancySeconds: options.stuckOnExit ? null : occupancySeconds, landingTime,
    exitStartTime, clearTime: options.stuckOnExit ? null : clearTime, stopTime, geometry,
    groundPoints: movementPoints, holdingLine: EXIT_HOLDING_LINES[taxiway],
    route: path([{ x: geometry.reverse ? 1760 : 10, y: geometry.threshold.y }, ...movementPoints]),
    ...options }
}

function departure(runway, lineupStartTime, options = {}) {
  const geometry = runwayInfo(runway)
  const mixed = runway === '21R' || runway === '03L'
  const holdingPoint = geometry.reverse
    ? { x: mixed ? 1253 : geometry.threshold.x - 20, y: mixed ? 638 : 495 }
    : { x: mixed || options.crossing ? 383 : geometry.threshold.x, y: mixed ? 638 : 495 }
  const lineUpPoint = geometry.reverse
    ? { x: mixed ? 1236 : geometry.threshold.x - 25, y: geometry.threshold.y }
    : { x: geometry.threshold.x + 20, y: geometry.threshold.y }
  const lineupEndTime = lineupStartTime + 40
  const rollTime = options.rollTime ?? lineupEndTime + 10
  const runwayEndTime = rollTime + 35
  const straightNm = geometry.reverse ? 2.5 : 1.5
  const turnStartTime = runwayEndTime + straightNm / CLIMB_SPEED
  const turnDegrees = geometry.reverse ? -90 : 70
  const turnEndTime = turnStartTime + TURN_RADIUS_NM * Math.abs(turnDegrees) * DEG / CLIMB_SPEED
  const completeTime = turnEndTime + TURN_EXIT_NM / CLIMB_SPEED
  const taxiPoints = options.crossing ? [
    { t: 0, x: 383, y: 638, heading: -90 },
    { t: 40, x: 383, y: 550 },
    { t: 60, ...holdingPoint, heading: -90 },
    { t: lineupStartTime, ...holdingPoint, heading: -90 },
  ] : [{ t: 0, ...holdingPoint, heading: -90 }, { t: lineupStartTime, ...holdingPoint, heading: -90 }]
  const groundPoints = [...taxiPoints,
    { t: lineupStartTime + 24, x: holdingPoint.x, y: geometry.threshold.y + 7 },
    { t: lineupEndTime, ...lineUpPoint, heading: geometry.heading },
    { t: rollTime, ...lineUpPoint, heading: geometry.heading },
  ]
  return { id: 'dep-01', callsign: 'DEP 01', type: 'A320', wtc: 'Medium', kind: 'departure',
    color: AIRCRAFT_COLORS.departure, runway, taxiway: options.crossing ? 'D' : mixed ? geometry.reverse ? 'S' : 'D' : '',
    lineupStartTime, lineupEndTime, rollTime, runwayEndTime, straightNm, turnStartTime,
    turnEndTime, completeTime, turnDegrees, geometry, lineUpPoint, groundPoints,
    crossing: Boolean(options.crossing), route: path([...groundPoints, geometry.departureEnd]) }
}

export function getScenario(id = 'segregated', direction = '21') {
  const definition = SCENARIOS.find(scenario => scenario.id === id) ?? SCENARIOS[0]
  const activeDirection = definition.directions.includes(direction) ? direction : definition.directions[0]
  const reverse = activeDirection === '03'
  const arrivalRunway = reverse ? '03L' : '21R'
  const exit = reverse ? 'F' : 'O'
  let flights, description, spacingNm, events
  if (definition.id === 'mixed') {
    spacingNm = reverse ? 10 : 8
    const first = arrival('arr-01', arrivalRunway, 5, exit)
    const second = arrival('arr-02', arrivalRunway, 5 + spacingNm, exit)
    const departing = departure(arrivalRunway, first.exitStartTime)
    flights = [first, departing, second]
    description = `Mixed A/D/A on RWY ${arrivalRunway}; initial arrival spacing ${spacingNm} NM. ARR 01 clears via TWY ${exit} in 70 s. DEP 01 waits at TWY ${departing.taxiway}, lines up for 40 s as ARR 01 begins vacating, holds 10 s, then rolls.`
    events = [{ time: 0, label: `Initial spacing ${spacingNm} NM · DEP holding TWY ${departing.taxiway}` },
      { time: first.landingTime, label: 'ARR 01 landing · 70 s occupancy starts' },
      { time: first.exitStartTime, label: `ARR 01 vacating ${exit} · 40 s line-up starts` },
      { time: first.clearTime, label: 'ARR 01 fully beyond holding line' },
      { time: departing.lineupEndTime, label: 'DEP 01 lined up · hold 10 s' },
      { time: departing.rollTime, label: 'DEP 01 rolling' },
      { time: departing.runwayEndTime, label: 'DEP 01 runway end · radar handoff' },
      { time: second.landingTime, label: 'ARR 02 landing' },
      { time: second.clearTime, label: 'ARR 02 runway clear' }]
  } else if (definition.id === 'crossing') {
    spacingNm = 5
    const first = arrival('arr-01', '21R', 4, 'O')
    const second = arrival('arr-02', '21R', 9, 'O')
    const rollTime = second.landingTime - approachDuration(2)
    const departing = departure('21L', 100, { crossing: true, rollTime })
    flights = [first, departing, second]
    description = 'DEP 01 crosses RWY 21R via TWY D in 40 s with ARR 01 at 4 NM final; the ILS signal fluctuates during crossing. It lines up RWY 21L via TWY D and starts rolling as ARR 02 reaches 2 NM final on RWY 21R.'
    events = [{ time: 0, label: 'ARR 01 at 4 NM · cross via D / ILS fluctuation' },
      { time: 40, label: '40 s crossing complete · TWY D to RWY 21L' },
      { time: first.landingTime, label: 'ARR 01 landing RWY 21R' },
      { time: departing.lineupStartTime, label: 'DEP 01 line up RWY 21L via TWY D' },
      { time: departing.rollTime, label: 'ARR 02 at 2 NM · DEP 01 rolling RWY 21L' },
      { time: departing.runwayEndTime, label: 'DEP 01 runway end · radar handoff' },
      { time: second.landingTime, label: 'ARR 02 landing RWY 21R' },
      { time: second.clearTime, label: 'ARR 02 runway clear' }]
  } else if (definition.id === 'unroutine') {
    spacingNm = 5
    const first = arrival('arr-01', '21R', 5, 'O', 80)
    // Illustrative roll/taxi timing takes ARR 02 to the blocked part of R at
    // 292 s. It has no clearance time and remains short of the holding line.
    const second = arrival('arr-02', '21R', 10, 'R', 70, { stuckOnExit: true, exitRollSeconds: 55 })
    const third = arrival('arr-03', '21R', 15, 'O', 70, { wtc: 'Heavy' })
    third.goAroundTime = third.landingTime - approachDuration(1)
    third.goAroundReason = 'Runway not clear · ARR 02 stuck on TWY R'
    third.route = ''
    flights = [first, second, third]
    description = 'Light drizzle · both runways wet. Three arrivals start 5 NM apart. Medium ARR 01 clears TWY O in 80 s; Medium ARR 02 becomes stuck on rapid exit TWY R before clearing the holding line. Heavy ARR 03 goes around at 1 NM because the runway is not clear.'
    events = [{ time: 0, label: 'Both runways wet · light drizzle · initial spacing 5 NM' },
      { time: first.landingTime, label: 'ARR 01 Medium landing · TWY O / 80 s' },
      { time: first.clearTime, label: 'ARR 01 fully clear via TWY O' },
      { time: second.landingTime, label: 'ARR 02 Medium landing · exit via TWY R' },
      { time: second.stopTime, label: 'ARR 02 stuck on TWY R · runway not clear' },
      { time: third.goAroundTime, label: 'ARR 03 Heavy · GO AROUND at 1 NM · runway not clear' }]
  } else {
    const arriving = arrival('arr-01', arrivalRunway, 5, exit)
    const departing = departure(reverse ? '03R' : '21L', 20)
    flights = [arriving, departing]
    description = `Segregated ARR/DEP: arrivals land RWY ${arrivalRunway} and vacate via TWY ${exit}; departures use RWY ${departing.runway}.`
    events = [{ time: 0, label: `ARR RWY ${arrivalRunway} / DEP RWY ${departing.runway}` },
      { time: departing.lineupStartTime, label: `DEP 01 line up RWY ${departing.runway}` },
      { time: departing.rollTime, label: `DEP 01 rolling RWY ${departing.runway}` },
      { time: departing.runwayEndTime, label: 'DEP 01 runway end · radar handoff' },
      { time: arriving.landingTime, label: `ARR 01 landing RWY ${arrivalRunway}` },
      { time: arriving.exitStartTime, label: `ARR 01 vacating via TWY ${exit}` },
      { time: arriving.clearTime, label: 'ARR 01 fully beyond holding line' }]
  }
  const departing = flights.find(flight => flight.kind === 'departure')
  if (departing) events.push({ time: departing.turnStartTime,
    label: `DEP 01 ${departing.straightNm} NM beyond runway end · ${reverse ? 'left to 300°' : 'right to 280°'}` })
  const duration = Math.ceil(Math.max(...flights.map(flight => flight.kind === 'departure'
    ? flight.completeTime : flight.goAroundTime !== undefined ? flight.goAroundTime + 35
      : flight.stuckOnExit ? flight.stopTime + 35 : flight.clearTime + 15)))
  return { ...definition, direction: activeDirection, duration, description, events: events.sort((a, b) => a.time - b.time),
    arrivalRunway, departureRunway: departing?.runway ?? null, spacingNm, flights,
    speedProfile: '180 kt established; 150 kt from 5 NM final. Spacing shown at scenario start.',
    timingNote: 'Runway occupancy runs from threshold crossing until the entire aircraft is beyond the holding line. Unspecified taxi and takeoff timings are illustrative.' }
}

function arrivalState(flight, time) {
  const { geometry } = flight
  const elapsed = time - flight.landingTime
  const goAround = flight.goAroundTime !== undefined && time >= flight.goAroundTime
  const stuck = Boolean(flight.stuckOnExit && time >= flight.stopTime)
  const distanceNm = goAround ? 1 : approachDistance(flight.initialDistanceNm, time)
  let position, phase, display, speedKnots
  if (goAround) {
    position = { x: geometry.threshold.x - UNITS_PER_NM + (time - flight.goAroundTime) * CLIMB_SPEED * UNITS_PER_NM,
      y: geometry.threshold.y, heading: geometry.heading }
    phase = 'GO AROUND · runway not clear'
    display = 'radar'
    speedKnots = 180
  } else if (elapsed < 0) {
    position = { x: geometry.threshold.x - geometry.sign * distanceNm * UNITS_PER_NM,
      y: geometry.threshold.y, heading: geometry.heading }
    speedKnots = distanceNm > 5 ? 180 : 150
    phase = distanceNm <= 1 ? 'Short final' : `Established · ${speedKnots} kt`
    display = position.x >= 10 && position.x <= 1760 ? 'ground' : 'radar'
  } else {
    position = interpolate(flight.groundPoints, time)
    phase = stuck ? `STUCK on TWY ${flight.taxiway} · runway not clear`
      : elapsed < 7 ? 'Touchdown' : time < flight.exitStartTime ? 'Landing roll'
      : flight.stuckOnExit || time < flight.clearTime ? `Vacating via TWY ${flight.taxiway}` : 'Runway clear · beyond holding line'
    speedKnots = 0
    display = flight.stuckOnExit || time < flight.clearTime + 15 ? 'ground' : 'hidden'
  }
  return { ...flight, ...position, radar: chartToRadar(position), headingMagnetic: headingMagnetic(position.heading),
    distanceNm: goAround ? Math.abs(position.x - geometry.threshold.x) / UNITS_PER_NM : distanceNm,
    speedKnots, phase, display, goAround, stuck, runwayCleared: !goAround && !flight.stuckOnExit && time >= flight.clearTime,
    runwayOccupied: !goAround && elapsed >= 0 && (flight.stuckOnExit || time < flight.clearTime),
    elapsedOccupancySec: goAround ? 0 : flight.stuckOnExit ? Math.max(0, elapsed) : clamp(elapsed, 0, flight.occupancySeconds) }
}

function departureState(flight, time) {
  const { geometry } = flight
  let position, phase, display = 'ground', distanceNm = 0
  if (time < flight.rollTime) {
    position = interpolate(flight.groundPoints, time)
    phase = flight.crossing && time < 40 ? 'Crossing RWY 21R via D · 40 s'
      : flight.crossing && time < 60 ? 'Taxi to RWY 21L via D'
      : time < flight.lineupStartTime ? `Holding short${flight.taxiway ? ` · TWY ${flight.taxiway}` : ''}`
      : time < flight.lineupEndTime ? `Lining up${flight.crossing ? ' via D' : ''} · 40 s`
      : `Holding on runway · ${flight.rollTime - flight.lineupEndTime} s`
  } else if (time < flight.runwayEndTime) {
    // Constant acceleration from rest to the end prevents a jump at radar handoff.
    const progress = (time - flight.rollTime) / (flight.runwayEndTime - flight.rollTime)
    position = { x: flight.lineUpPoint.x + (geometry.departureEnd.x - flight.lineUpPoint.x) * progress ** 2,
      y: geometry.threshold.y, heading: geometry.heading }
    phase = 'Departure roll'
  } else {
    display = time >= flight.completeTime ? 'hidden' : 'radar'
    const elapsed = Math.min(time, flight.completeTime) - flight.runwayEndTime
    distanceNm = elapsed * CLIMB_SPEED
    const initialHeading = geometry.heading * DEG
    const straightDistance = Math.min(distanceNm, flight.straightNm)
    let xNm = Math.cos(initialHeading) * straightDistance
    let yNm = Math.sin(initialHeading) * straightDistance
    let heading = geometry.heading
    phase = `Climb straight · ${flight.straightNm} NM`
    if (time >= flight.turnStartTime) {
      const turnDirection = Math.sign(flight.turnDegrees)
      const angularTravel = Math.min((Math.min(time, flight.completeTime) - flight.turnStartTime) * CLIMB_SPEED / TURN_RADIUS_NM,
        Math.abs(flight.turnDegrees) * DEG)
      const finalHeading = initialHeading + turnDirection * angularTravel
      xNm += TURN_RADIUS_NM / turnDirection * (Math.sin(finalHeading) - Math.sin(initialHeading))
      yNm += TURN_RADIUS_NM / turnDirection * (-Math.cos(finalHeading) + Math.cos(initialHeading))
      heading = finalHeading / DEG
      const afterTurnNm = Math.max(0, Math.min(time, flight.completeTime) - flight.turnEndTime) * CLIMB_SPEED
      xNm += Math.cos(finalHeading) * afterTurnNm
      yNm += Math.sin(finalHeading) * afterTurnNm
      phase = time < flight.turnEndTime ? `${geometry.reverse ? 'Left' : 'Right'} turn · HDG ${geometry.reverse ? '300' : '280'}`
        : `Climbing · HDG ${geometry.reverse ? '300' : '280'}`
    }
    position = { x: geometry.departureEnd.x + xNm * UNITS_PER_NM,
      y: geometry.departureEnd.y + yNm * UNITS_PER_NM, heading }
    if (display === 'hidden') phase = 'Departure complete'
  }
  return { ...flight, ...position, radar: chartToRadar(position), headingMagnetic: headingMagnetic(position.heading),
    distanceNm, speedKnots: display === 'radar' ? 180 : 0, phase, display,
    lineupElapsedSec: clamp(time - flight.lineupStartTime, 0, 40),
    holdElapsedSec: clamp(time - flight.lineupEndTime, 0, flight.rollTime - flight.lineupEndTime),
    runwayOccupied: time >= flight.lineupStartTime && time < flight.runwayEndTime }
}

export function getScenarioState(id = 'segregated', direction = '21', time = 0) {
  const scenario = getScenario(id, direction)
  const t = clamp(Number.isFinite(time) ? time : 0, 0, scenario.duration)
  const aircraft = scenario.flights.map(flight => flight.kind === 'arrival' ? arrivalState(flight, t) : departureState(flight, t))
  const latestEvent = scenario.events.findLast(event => event.time <= t) ?? scenario.events[0]
  const goAround = aircraft.find(flight => flight.goAround)
  const ilsFluctuation = scenario.id === 'crossing' && t < 40
  return { aircraft, wet: scenario.id === 'unroutine', ilsFluctuation,
    phase: goAround ? 'GO AROUND · runway not clear' : latestEvent.label,
    caption: goAround ? `${goAround.callsign} Heavy: go around initiated at 1 NM. ARR 02 remains stuck on rapid exit R, before the holding line; RWY 21R is not clear.`
      : ilsFluctuation ? 'ILS signal fluctuation while DEP 01 crosses RWY 21R via TWY D.' : latestEvent.label,
    time: t, duration: scenario.duration, direction: scenario.direction }
}
