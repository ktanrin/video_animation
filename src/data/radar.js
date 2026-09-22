// Radar distances use nautical miles. 1 NM = 1852 metres exactly.
// X points toward the 03 runway ends, matching the ground chart's orientation.
// This is a presentation inset, with a separate scale from the ground map.
export const METRES_PER_NM = 1852
export const PANELS = Object.freeze({
  width: 1792,
  aerodromeHeight: 600,
  radarHeight: 200,
})
export const RADAR = Object.freeze({
  width: PANELS.width,
  height: PANELS.radarHeight,
  pixelsPerNm: 32,
  originX: 896 - (3700 / 1852 * 32) / 2,
  originY: 100 + (121 * (3700 / 1089) / 1852 * 32) / 2,
  intervalNm: 5,
  maximumRingNm: 35,
  localizerLengthNm: 15,
})

// Threshold offsets follow the supplied chart's landscape coordinate system.
// The 21R-to-03L axis defines the diagram's metre scale. Offsets are approximate
// chart measurements, not surveyed coordinates or navigational data.
const metresPerChartUnit = 3700 / (1470 - 381)
const eastThreshold = {
  x: (375 - 381) * metresPerChartUnit / METRES_PER_NM,
  y: (468 - 589) * metresPerChartUnit / METRES_PER_NM,
}
export const RADAR_RUNWAYS = Object.freeze([
  {
    id: '21R', opposite: '03L', lengthM: 3700, displacedThresholdM: 0,
    threshold: { x: 0, y: 0 }, color: '#9ee5d7', labelSide: 1,
  },
  {
    id: '21L', opposite: '03R', lengthM: 3500, displacedThresholdM: 350,
    threshold: eastThreshold, color: '#b9cfe8', labelSide: -1,
  },
])

export function radarPoint(point, config = RADAR) {
  return {
    x: config.originX + point.x * config.pixelsPerNm,
    y: config.originY + point.y * config.pixelsPerNm,
  }
}
export function runwayGeometry(runway, config = RADAR) {
  const threshold = radarPoint(runway.threshold, config)
  const start = radarPoint({
    x: runway.threshold.x - runway.displacedThresholdM / METRES_PER_NM,
    y: runway.threshold.y,
  }, config)
  const end = radarPoint({
    x: runway.threshold.x + (runway.lengthM - runway.displacedThresholdM) / METRES_PER_NM,
    y: runway.threshold.y,
  }, config)
  return { threshold, start, end }
}
export const RANGE_RINGS = Array.from(
  { length: RADAR.maximumRingNm / RADAR.intervalNm },
  (_, i) => {
    const nm = (i + 1) * RADAR.intervalNm
    return { nm, radius: nm * RADAR.pixelsPerNm }
  },
)

// Shared conversion keeps aircraft positions identical in both displays.
export const CHART_METRES_PER_UNIT = metresPerChartUnit
export function chartToRadar(point) {
  return radarPoint({x:(point.x-381)*metresPerChartUnit/METRES_PER_NM,
    y:(point.y-589)*metresPerChartUnit/METRES_PER_NM})
}
export function localizerGeometry(runway, direction='21') {
  const geometry=runwayGeometry(runway)
  const threshold=direction==='03'?geometry.end:geometry.threshold
  const side=direction==='03'?1:-1
  return {...geometry, activeThreshold:threshold, side,
    activeId:direction==='03'?runway.opposite:runway.id,
    courseEnd:{x:threshold.x+side*RADAR.localizerLengthNm*RADAR.pixelsPerNm,y:threshold.y}}
}
