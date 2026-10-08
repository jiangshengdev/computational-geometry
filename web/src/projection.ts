import { scaleLinear } from 'd3'
import { approximate, type Point } from './geometry'

export function projectPoints(points: Point[], width: number, height: number, padding: number) {
  const xs = points.map(p => approximate(p.x)), ys = points.map(p => approximate(p.y))
  const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs)
  const minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys)
  const unit = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY))
  const x = scaleLinear().domain([minX, maxX]).range([width / 2 - (maxX - minX) * unit / 2, width / 2 + (maxX - minX) * unit / 2])
  const y = scaleLinear().domain([minY, maxY]).range([height / 2 + (maxY - minY) * unit / 2, height / 2 - (maxY - minY) * unit / 2])
  return { minX, maxX, minY, maxY, x, y,
    px: (p: Point) => x(approximate(p.x)), py: (p: Point) => y(approximate(p.y)) }
}
