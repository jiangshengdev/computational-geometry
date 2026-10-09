import { scaleLinear } from 'd3'
import { approximate, type Point } from './geometry'

export function projectPoints(points: Point[], width: number, height: number, padding: number) {
  const xs = points.map(p => approximate(p.x)), ys = points.map(p => approximate(p.y))
  const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs)
  const minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys)
  const available = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY))
  const unit = 2 ** Math.floor(Math.log2(available))
  const plotWidth = (maxX - minX) * unit, plotHeight = (maxY - minY) * unit
  // Keep one affine projection: only the plot origin is rounded, never individual points.
  const left = Math.floor((width - plotWidth) / 2), top = Math.floor((height - plotHeight) / 2)
  const x = scaleLinear().domain([minX, maxX]).range([left, left + plotWidth])
  const y = scaleLinear().domain([minY, maxY]).range([top + plotHeight, top])
  return { minX, maxX, minY, maxY, x, y,
    px: (p: Point) => x(approximate(p.x)), py: (p: Point) => y(approximate(p.y)) }
}
