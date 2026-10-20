import { useLayoutEffect, useRef, useState } from 'react'
import { select, zoom, zoomIdentity, zoomTransform, type ZoomTransform } from 'd3'
import { projectPoints } from './projection'
import type { Point } from './geometry'

/** Owns the SVG viewport, D3 listeners, resize lifecycle and view controls. */
export function useGeometryViewport(points: Point[], { preserveViewKey, padding = 64 }: { preserveViewKey?: boolean; padding?: number } = {}) {
  const svg = useRef<SVGSVGElement>(null)
  const [{ width, height }, setSize] = useState({ width: 800, height: 460 })
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const [angle, setAngle] = useState(0)
  const currentAngle = useRef(0)
  const updateAngle = (value: number) => { currentAngle.current = value; setAngle(value) }
  const behavior = useRef(zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 40]).clickDistance(4))
  useLayoutEffect(() => {
    const element = svg.current!
    const validSize = ({ width, height }: DOMRect) =>
      Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    const initial = element.getBoundingClientRect()
    let previous = validSize(initial) ? initial : null
    if (previous) setSize({ width: initial.width, height: initial.height })
    behavior.current.on('zoom', event => setTransform(event.transform))
    select(element).call(behavior.current).on('wheel.zoom', null)
    const observer = new ResizeObserver(() => {
      // Transient layout collapse must not replace the last valid view or reset zoom.
      const size = element.getBoundingClientRect()
      if (!validSize(size) || (size.width === previous?.width && size.height === previous?.height)) return
      previous = size
      setSize({ width: size.width, height: size.height })
      select(element).call(behavior.current.transform, zoomIdentity)
    })
    observer.observe(element)
    return () => { select(element).on('.zoom', null); observer.disconnect() }
  }, [preserveViewKey])

  // Rotation lives inside the D3 zoom transform; D3 remains the sole pan/zoom owner.
  const rotate = (degrees: number, anchor?: { x: number; y: number }) => {
    if (!Number.isFinite(degrees)) return
    const transform = zoomTransform(svg.current!)
    const angle = currentAngle.current
    const next = ((degrees % 360) + 360) % 360
    const radians = (next - angle) * Math.PI / 180
    const cx = width / 2, cy = height / 2
    const oldRadians = angle * Math.PI / 180
    const pivot = anchor ? {
      x: transform.applyX(cx + (anchor.x - cx) * Math.cos(oldRadians) - (anchor.y - cy) * Math.sin(oldRadians)),
      y: transform.applyY(cy + (anchor.x - cx) * Math.sin(oldRadians) + (anchor.y - cy) * Math.cos(oldRadians)),
    } : { x: cx, y: cy }
    const origin = { x: transform.applyX(cx), y: transform.applyY(cy) }
    const dx = pivot.x - origin.x, dy = pivot.y - origin.y
    const x = transform.x + dx - (dx * Math.cos(radians) - dy * Math.sin(radians))
    const y = transform.y + dy - (dx * Math.sin(radians) + dy * Math.cos(radians))
    select(svg.current!).call(behavior.current.transform, zoomIdentity.translate(x, y).scale(transform.k))
    updateAngle(next)
  }

  // Keep one projection for drawing and for centering the rotated input bounds.
  const projection = projectPoints(points, width, height, Math.min(padding, width / 4, height / 4))
  const center = () => {
    if (!projection || !points.length) return
    const radians = currentAngle.current * Math.PI / 180
    const cos = Math.cos(radians), sin = Math.sin(radians)
    const cx = width / 2, cy = height / 2
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const point of points) {
      const dx = projection.px(point) - cx, dy = projection.py(point) - cy
      const x = cx + dx * cos - dy * sin, y = cy + dx * sin + dy * cos
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    select(svg.current!).call(behavior.current.translateTo, (minX + maxX) / 2, (minY + maxY) / 2)
  }

  return {
    svg, width, height, transform, angle, rotate, center,
    rotateBy: (degrees: number, anchor?: { x: number; y: number }) => rotate(currentAngle.current + degrees, anchor),
    geometryTransform: `${transform.toString()} rotate(${angle} ${width / 2} ${height / 2})`,
    // Keep at least half of the shorter dimension available for geometry.
    projection,
    zoomIn: () => select(svg.current!).call(behavior.current.scaleBy, 1.4),
    zoomOut: () => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4),
    reset: () => {
      updateAngle(0)
      select(svg.current!).call(behavior.current.transform, zoomIdentity)
    },
  }
}

export type GeometryViewport = ReturnType<typeof useGeometryViewport>
