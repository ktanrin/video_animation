import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { getScenario, getScenarioState, SCENARIOS } from '../src/data/hiro.js'

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.cache/ms-playwright')
const { chromium } = await import('playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1060 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
mkdirSync('qa', { recursive: true })
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173'
const fps = 30
const range = page.getByRole('slider', { name: 'Video frame' })

async function selectScenario(id, direction = '21') {
  await page.locator('#movement').selectOption(id)
  if (await page.locator('#direction').isEnabled()) await page.locator('#direction').selectOption(direction)
  assert.equal(await page.locator('#direction').inputValue(), direction)
  assert.equal(await range.inputValue(), '0', 'Scenario changes must reset the timeline')
}

async function seek(time) {
  const frame = Math.round(time * fps)
  await range.evaluate((input, value) => {
    input.value = String(value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, frame)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())))
  assert.equal(Number(await range.inputValue()), frame)
}

async function renderedAircraft() {
  return page.locator('[data-aircraft]').evaluateAll(nodes => nodes.map(node => ({
    callsign: node.getAttribute('data-aircraft'),
    panel: node.closest('[data-panel]')?.getAttribute('data-panel'),
    transform: node.getAttribute('transform'),
    x: Number(node.getAttribute('data-x')),
    y: Number(node.getAttribute('data-y')),
    phase: node.getAttribute('data-phase'),
  })).sort((a, b) => a.callsign.localeCompare(b.callsign)))
}

async function verifyTraffic(id, direction, time) {
  await seek(time)
  const expected = getScenarioState(id, direction, Math.round(time * fps) / fps).aircraft.filter(aircraft => aircraft.display !== 'hidden')
  const actual = await renderedAircraft()
  assert.equal(actual.length, expected.length, `${id}/${direction} at ${time}: visible aircraft count`)
  for (const aircraft of expected) {
    const matches = actual.filter(item => item.callsign === aircraft.callsign)
    assert.equal(matches.length, 1, `${aircraft.callsign} must appear exactly once across both panels`)
    assert.equal(matches[0].panel, aircraft.display === 'ground' ? 'aerodrome' : 'radar', `${aircraft.callsign} panel at ${time}`)
  }
  return { expected, actual }
}

try {
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Ground movement', exact: true }).waitFor()
  await page.locator('image').evaluateAll(async images => {
    await Promise.all(images.map(element => new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = resolve
      image.onerror = reject
      image.src = element.getAttribute('href')
    })))
  })
  assert.deepEqual(await page.locator('#direction option').allTextContents(), ['RWY-IN-USE 21', 'RWY-IN-USE 03'])
  assert.equal(await page.locator('#movement option').count(), 4)
  assert.deepEqual(await page.locator('#movement option').evaluateAll(options => options.map(option => option.value)), SCENARIOS.map(item => item.id))

  for (const [id, direction] of [['segregated', '21'], ['segregated', '03'], ['mixed', '21'], ['mixed', '03'], ['crossing', '21'], ['unroutine', '21']]) {
    await selectScenario(id, direction)
    const scenario = getScenario(id, direction)
    assert.equal(Number(await range.getAttribute('max')), Math.ceil(scenario.duration * fps))
    assert.equal(await page.locator('#direction').isDisabled(), ['crossing', 'unroutine'].includes(id))
    const baseline = await verifyTraffic(id, direction, 0)
    assert.ok(baseline.actual.length >= 2, 'Every scenario starts with multiple aircraft')
    const times = [...new Set([0, scenario.duration / 3, scenario.duration * 2 / 3, ...scenario.events.map(event => event.time)])]
      .filter(time => time <= scenario.duration)
    for (const time of times) await verifyTraffic(id, direction, time)
    const repeatTime = scenario.duration / 3
    const first = (await verifyTraffic(id, direction, repeatTime)).actual
    await seek(scenario.duration)
    const repeated = (await verifyTraffic(id, direction, repeatTime)).actual
    assert.deepEqual(repeated, first, 'Scrubbing back must reproduce the same aircraft positions')

    const eventIndex = Math.min(2, scenario.events.length - 1)
    await page.locator('.event-row').nth(eventIndex).click()
    assert.equal(Number(await range.inputValue()), Math.round(scenario.events[eventIndex].time * fps))
    await page.getByRole('button', { name: 'Export video', exact: false }).click()
    assert.ok(await page.getByRole('dialog').isVisible())
    assert.match(await page.locator('.export-dialog pre').innerText(), new RegExp(`--scenario=${id} --direction=${direction}`))
    await page.getByRole('button', { name: 'Got it', exact: true }).click()
    await page.getByRole('button', { name: 'Restart', exact: true }).click()
    assert.equal(await range.inputValue(), '0')
    await page.screenshot({ path: `qa/hiro-${id}-${direction}.png`, fullPage: true })
  }

  await selectScenario('mixed', '03')
  await page.locator('#movement').selectOption('crossing')
  assert.equal(await page.locator('#direction').inputValue(), '21', 'A restricted scenario selected from 03 must normalize to 21')
  assert.ok(await page.locator('#direction').isDisabled())

  for (const direction of ['21', '03']) {
    await selectScenario('segregated', direction)
    const departure = getScenario('segregated', direction).flights.find(flight => flight.kind === 'departure')
    const handover = departure.runwayEndTime
    await verifyTraffic('segregated', direction, handover - 1 / fps)
    assert.equal(await page.locator('[data-panel="aerodrome"] [data-kind="departure"]').count(), 1)
    await verifyTraffic('segregated', direction, handover)
    assert.equal(await page.locator('[data-panel="radar"] [data-kind="departure"]').count(), 1)
    await page.screenshot({ path: `qa/hiro-departure-handover-${direction}.png`, fullPage: true })
    await verifyTraffic('segregated', direction, departure.turnStartTime)
    await verifyTraffic('segregated', direction, departure.turnEndTime)
  }

  await selectScenario('crossing', '21')
  await verifyTraffic('crossing', '21', 10)
  assert.ok(await page.locator('[data-effect="ils-fluctuation"]').count(), 'Crossing should display ILS fluctuation')
  await page.screenshot({ path: 'qa/hiro-crossing-ils.png', fullPage: true })
  await seek(40)
  assert.equal(await page.locator('[data-effect="ils-fluctuation"]').count(), 0, 'ILS fluctuation stops after the crossing')
  const crossingDeparture = getScenario('crossing', '21').flights.find(flight => flight.kind === 'departure')
  const rolling = (await verifyTraffic('crossing', '21', crossingDeparture.rollTime)).expected
  assert.ok(Math.abs(rolling.find(flight => flight.id === 'arr-02').distanceNm - 2) < .001)

  await selectScenario('unroutine', '21')
  const heavy = getScenario('unroutine', '21').flights.find(flight => flight.id === 'arr-03')
  await verifyTraffic('unroutine', '21', heavy.goAroundTime)
  assert.ok(await page.locator('[data-effect="runway-wet"]').count(), 'Unroutine scenario should show wet runway')
  assert.equal(await page.locator('[data-wet-runway]').count(), 2, 'Both ground runways must be highlighted and labeled wet')
  assert.equal(await page.locator('[data-effect="radar-runway-wet"]').count(), 2, 'Both radar runways must be highlighted wet')
  const stuckTarget = page.locator('[data-panel="aerodrome"] [data-aircraft="ARR 02"]')
  assert.match(await stuckTarget.getAttribute('data-phase'), /STUCK on TWY R/)
  const stoppedX = await stuckTarget.getAttribute('data-x')
  const stoppedY = await stuckTarget.getAttribute('data-y')
  assert.ok(await page.locator('[data-effect="drizzle"]').count(), 'Unroutine scenario should show drizzle')
  assert.ok(await page.getByText(/go.around/i).count(), 'Unroutine scenario should show go-around')
  await page.screenshot({ path: 'qa/hiro-unroutine-go-around.png', fullPage: true })
  await seek(getScenario('unroutine').duration)
  assert.equal(await stuckTarget.getAttribute('data-x'), stoppedX)
  assert.equal(await stuckTarget.getAttribute('data-y'), stoppedY)
  assert.match(await stuckTarget.getAttribute('data-phase'), /STUCK on TWY R/)

  await selectScenario('mixed', '21')
  await page.locator('#speed').selectOption('8')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.waitForFunction(() => Number(document.querySelector('[aria-label="Video frame"]').value) > 60)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = await range.inputValue()
  await page.waitForTimeout(100)
  assert.equal(await range.inputValue(), paused, 'Pause must stop the clock')
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  assert.equal(await range.inputValue(), '0')
  await page.getByRole('button', { name: 'Layout', exact: true }).click()
  await page.getByLabel('Aircraft', { exact: true }).uncheck()
  assert.equal(await page.locator('[data-aircraft]').count(), 0)
  await page.getByLabel('Aircraft', { exact: true }).check()
  assert.ok(await page.locator('[data-aircraft]').count() >= 3)
  await page.getByLabel('Aircraft routes', { exact: true }).uncheck()
  await page.getByLabel('Aircraft routes', { exact: true }).check()
  await page.getByLabel('Chart hot spots', { exact: true }).check()
  assert.ok(await page.getByText('HS1', { exact: true }).count())
  await page.getByLabel('Chart hot spots', { exact: true }).uncheck()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  assert.ok(await page.getByRole('button', { name: '125%', exact: true }).isVisible())
  await page.getByRole('button', { name: '125%', exact: true }).click()
  await page.getByRole('button', { name: 'Chart', exact: true }).click()
  assert.match(await page.locator('[data-panel="aerodrome"] image').getAttribute('href'), /vtbd-chart/)
  await page.screenshot({ path: 'qa/hiro-chart.png', fullPage: true })
  await page.getByRole('button', { name: 'Presentation', exact: true }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Scenario', exact: true }).click()
  await selectScenario('unroutine', '21')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout must fit without horizontal page overflow')
  await page.screenshot({ path: 'qa/hiro-mobile.png', fullPage: true })
  assert.deepEqual(errors, [], 'No browser runtime errors')
  console.log('HIRO preview passed: six scenario/direction combinations, traffic panels, event seeking, deterministic scrubbing, departure handovers, ILS/wet/go-around effects, playback, layers, chart, zoom, export commands, and mobile layout.')
} finally {
  await browser.close()
}
