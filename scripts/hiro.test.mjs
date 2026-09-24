import test from 'node:test'
import assert from 'node:assert/strict'
import { AIRCRAFT_COLORS, SCENARIOS, approachDistance, approachDuration, getScenario, getScenarioState } from '../src/data/hiro.js'
import { RADAR, RADAR_RUNWAYS, chartToRadar, runwayGeometry } from '../src/data/radar.js'

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`)
const flightAt = (id, direction, time, aircraftId) => getScenarioState(id, direction, time).aircraft.find(aircraft => aircraft.id === aircraftId)

test('four scenarios expose the requested runway combinations and normalize 21-only scenarios', () => {
  assert.deepEqual(SCENARIOS.map(scenario => scenario.id), ['segregated', 'mixed', 'crossing', 'unroutine'])
  for (const direction of ['21', '03']) {
    const segregated = getScenario('segregated', direction)
    assert.equal(segregated.arrivalRunway, direction === '21' ? '21R' : '03L')
    assert.equal(segregated.departureRunway, direction === '21' ? '21L' : '03R')
    assert.equal(segregated.flights[0].taxiway, direction === '21' ? 'O' : 'F')
    const mixed = getScenario('mixed', direction)
    assert.equal(mixed.arrivalRunway, mixed.departureRunway)
    assert.equal(mixed.flights.find(flight => flight.kind === 'departure').taxiway, direction === '21' ? 'D' : 'S')
  }
  for (const id of ['crossing', 'unroutine']) {
    assert.equal(getScenario(id, '03').direction, '21')
    assert.deepEqual(getScenarioState(id, '03', 125), getScenarioState(id, '21', 125))
  }
})

test('approaches establish at 180 kt and slow to 150 kt at 5 NM without a position jump', () => {
  near(approachDuration(5), 120)
  near(approachDuration(10), 220)
  near(approachDuration(15), 320)
  for (const initial of [4, 5, 10, 13, 15]) {
    const slowdown = Math.max(0, initial - 5) / (180 / 3600)
    const state = flightAt('unroutine', '21', 100, 'arr-02')
    near(state.distanceNm, 5)
    assert.equal(state.speedKnots, 150)
    near(approachDistance(initial, approachDuration(initial)), 0)
    if (initial > 5) {
      near((approachDistance(initial, slowdown - 1) - approachDistance(initial, slowdown)) * 3600, 180)
      near((approachDistance(initial, slowdown) - approachDistance(initial, slowdown + 1)) * 3600, 150)
      near(approachDistance(initial, slowdown - 1e-7), approachDistance(initial, slowdown), 1e-7)
    }
  }
})

for (const direction of ['21', '03']) {
  test(`mixed ${direction}: initial spacing, 70 s clearance, 40 s line-up and 10 s hold`, () => {
    const scenario = getScenario('mixed', direction)
    const arriving = scenario.flights.find(flight => flight.id === 'arr-01')
    const departing = scenario.flights.find(flight => flight.id === 'dep-01')
    const initial = getScenarioState('mixed', direction, 0).aircraft.filter(flight => flight.kind === 'arrival')
    near(initial[1].distanceNm - initial[0].distanceNm, direction === '21' ? 8 : 10)
    near(arriving.clearTime - arriving.landingTime, 70)
    near(departing.lineupStartTime, arriving.exitStartTime)
    near(departing.lineupEndTime - departing.lineupStartTime, 40)
    near(departing.rollTime - departing.lineupEndTime, 10)
    assert.equal(flightAt('mixed', direction, arriving.clearTime - 1e-6, arriving.id).runwayCleared, false)
    const cleared = flightAt('mixed', direction, arriving.clearTime, arriving.id)
    assert.equal(cleared.runwayCleared, true)
    assert.equal(cleared.runwayOccupied, false)
    // Beyond the chart's actual exit holding line by more than the tail length.
    assert.ok(Math.hypot(cleared.x - cleared.holdingLine.x, cleared.y - cleared.holdingLine.y) > 26)
    const onRunway = flightAt('mixed', direction, departing.lineupEndTime, departing.id)
    for (const offset of [0.1, 5, 9.999]) {
      const holding = flightAt('mixed', direction, departing.lineupEndTime + offset, departing.id)
      near(holding.x, onRunway.x)
      near(holding.y, onRunway.y)
      assert.match(holding.phase, /Holding on runway/)
    }
    assert.match(flightAt('mixed', direction, departing.rollTime, departing.id).phase, /Departure roll/)
    assert.ok(flightAt('mixed', direction, departing.rollTime + 1, departing.id).x !== onRunway.x)
  })

  for (const id of ['segregated', 'mixed']) {
    test(`${id} ${direction}: departure transfers at the physical runway end, then turns at the requested distance`, () => {
      const scenario = getScenario(id, direction)
      const flight = scenario.flights.find(aircraft => aircraft.kind === 'departure')
      const runway = RADAR_RUNWAYS.find(runway => [runway.id, runway.opposite].includes(flight.runway))
      const geometry = runwayGeometry(runway)
      const physicalEnd = direction === '21' ? geometry.end : geometry.start
      const epsilon = 1e-7
      const before = flightAt(id, direction, flight.runwayEndTime - epsilon, flight.id)
      const handoff = flightAt(id, direction, flight.runwayEndTime, flight.id)
      const after = flightAt(id, direction, flight.runwayEndTime + epsilon, flight.id)
      assert.equal(before.display, 'ground')
      assert.equal(handoff.display, 'radar')
      assert.equal(after.display, 'radar')
      near(handoff.radar.x, physicalEnd.x)
      near(handoff.radar.y, physicalEnd.y)
      near(before.x, handoff.x, 1e-4)
      near(after.x, handoff.x, 1e-4)
      near(handoff.distanceNm, 0)
      const turn = flightAt(id, direction, flight.turnStartTime, flight.id)
      const requiredNm = direction === '21' ? 1.5 : 2.5
      near(Math.abs(turn.radar.x - physicalEnd.x) / RADAR.pixelsPerNm, requiredNm)
      near(turn.radar.y, physicalEnd.y)
      near(turn.distanceNm, requiredNm)
      const turning = flightAt(id, direction, (flight.turnStartTime + flight.turnEndTime) / 2, flight.id)
      const final = flightAt(id, direction, flight.turnEndTime, flight.id)
      if (direction === '21') assert.ok(turning.heading > 0 && turning.heading < 70)
      else assert.ok(turning.heading < 180 && turning.heading > 90)
      near(final.headingMagnetic, direction === '21' ? 280 : 300)
      assert.equal(final.display, 'radar')
      assert.ok(final.radar.y > physicalEnd.y)
      assert.ok(final.radar.y < RADAR.height)
      assert.equal(flightAt(id, direction, flight.completeTime, flight.id).display, 'hidden')
    })
  }
}

test('crossing lasts exactly 40 s with ILS fluctuation; departure rolls at ARR 02 exactly 2 NM', () => {
  const scenario = getScenario('crossing')
  const departing = scenario.flights.find(flight => flight.id === 'dep-01')
  const initial = getScenarioState('crossing', '21', 0)
  near(initial.aircraft.find(flight => flight.id === 'arr-01').distanceNm, 4)
  assert.equal(initial.ilsFluctuation, true)
  assert.equal(getScenarioState('crossing', '21', 39.999).ilsFluctuation, true)
  assert.equal(getScenarioState('crossing', '21', 40).ilsFluctuation, false)
  const start = flightAt('crossing', '21', 0, departing.id)
  const complete = flightAt('crossing', '21', 40, departing.id)
  assert.equal(departing.taxiway, 'D')
  near(start.x, 383)
  near(complete.x, 383)
  for (const time of [10, 20, 39.999, 50, 60, 99, 100, 120]) {
    near(flightAt('crossing', '21', time, departing.id).x, 383)
  }
  const linedUp = flightAt('crossing', '21', departing.lineupEndTime, departing.id)
  near(linedUp.y, 468)
  assert.ok(linedUp.x < 410, 'Line-up must stay at the D end, not cross via S')
  assert.ok(start.y > 589)
  assert.ok(complete.y < 589)
  assert.match(start.phase, /Crossing/)
  assert.match(complete.phase, /Taxi to RWY 21L/)
  const atRoll = getScenarioState('crossing', '21', departing.rollTime)
  near(atRoll.aircraft.find(flight => flight.id === 'arr-02').distanceNm, 2)
  assert.equal(atRoll.aircraft.find(flight => flight.id === 'dep-01').phase, 'Departure roll')
  assert.equal(departing.runway, '21L')
})

test('wet scenario clears ARR 01 in 80 s, leaves ARR 02 stuck on R, and sends Heavy around at 1 NM', () => {
  const scenario = getScenario('unroutine')
  const [first, second, heavy] = scenario.flights
  assert.deepEqual(scenario.flights.map(flight => flight.initialDistanceNm), [5, 10, 15])
  assert.deepEqual(scenario.flights.map(flight => flight.wtc), ['Medium', 'Medium', 'Heavy'])
  assert.equal(first.taxiway, 'O')
  assert.equal(second.taxiway, 'R')
  near(first.clearTime - first.landingTime, 80)
  assert.equal(second.clearTime, null)
  assert.equal(second.occupancySeconds, null)
  assert.ok(second.stopTime < heavy.goAroundTime)
  assert.ok(!scenario.events.some(event => /ARR 02.*(fully clear|runway clear)/i.test(event.label)))
  near(heavy.goAroundTime, 296)
  assert.equal(getScenarioState('unroutine', '21', 0).wet, true)
  const before = flightAt('unroutine', '21', heavy.goAroundTime - 1e-7, heavy.id)
  const state = getScenarioState('unroutine', '21', heavy.goAroundTime)
  const goingAround = state.aircraft.find(flight => flight.id === heavy.id)
  near(goingAround.distanceNm, 1)
  assert.equal(before.goAround, false)
  assert.equal(goingAround.goAround, true)
  assert.equal(goingAround.display, 'radar')
  near(before.x, goingAround.x, 1e-4)
  assert.equal(state.aircraft.find(flight => flight.id === second.id).runwayOccupied, true)
  const stopped = flightAt('unroutine', '21', second.stopTime, second.id)
  assert.ok(stopped.y < stopped.holdingLine.y, 'Aircraft stops before the exit holding line')
  for (const time of [second.stopTime, heavy.goAroundTime, 305, scenario.duration]) {
    const blocked = flightAt('unroutine', '21', time, second.id)
    near(blocked.x, stopped.x)
    near(blocked.y, stopped.y)
    assert.equal(blocked.stuck, true)
    assert.equal(blocked.runwayOccupied, true)
    assert.equal(blocked.runwayCleared, false)
    assert.equal(blocked.display, 'ground')
    assert.match(blocked.phase, /STUCK on TWY R/)
  }
  assert.equal(flightAt('unroutine', '21', second.stopTime - .01, second.id).stuck, false)
  assert.match(state.phase, /GO AROUND/)
  assert.equal(flightAt('unroutine', '21', heavy.landingTime, heavy.id).runwayOccupied, false)
})

test('all scenarios have deterministic finite state, stable aircraft identities and shared map/radar positions', () => {
  for (const scenario of SCENARIOS) for (const direction of scenario.directions) {
    const model = getScenario(scenario.id, direction)
    const expectedIds = model.flights.map(flight => flight.id)
    for (let time = 0; time <= model.duration; time += 0.25) {
      const state = getScenarioState(scenario.id, direction, time)
      assert.deepEqual(state.aircraft.map(flight => flight.id), expectedIds)
      for (const flight of state.aircraft) {
        for (const value of [flight.x, flight.y, flight.heading, flight.headingMagnetic, flight.distanceNm, flight.radar.x, flight.radar.y]) {
          assert.ok(Number.isFinite(value), `${scenario.id}/${direction}/${time}: ${flight.id}`)
        }
        assert.deepEqual(flight.radar, chartToRadar(flight))
        assert.ok(['radar', 'ground', 'hidden'].includes(flight.display))
        assert.equal(flight.color, AIRCRAFT_COLORS[flight.kind])
      }
    }
    const expected = getScenarioState(scenario.id, direction, 121.375)
    getScenarioState(scenario.id, direction, model.duration)
    getScenarioState(scenario.id, direction, 0)
    assert.deepEqual(getScenarioState(scenario.id, direction, 121.375), expected)
    assert.deepEqual(getScenarioState(scenario.id, direction, -100), getScenarioState(scenario.id, direction, 0))
    assert.deepEqual(getScenarioState(scenario.id, direction, Infinity), getScenarioState(scenario.id, direction, 0))
    for (let index = 1; index < model.events.length; index++) assert.ok(model.events[index].time >= model.events[index - 1].time)
    assert.ok(model.events.at(-1).time <= model.duration)
  }
})
