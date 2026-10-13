import { useLayoutEffect, useRef, useState } from 'react'
import { select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { projectPoints } from './projection'
import type { Point } from './geometry'

/** Owns the SVG viewport, D3 listeners, resize lifecycle and view controls. */
export function useGeometryViewport(points: Point[], preserveViewKey?: boolean) {
  const svg = useRef<SVGSVGElement>(null)
  const [{ width, height }, setSize] = useState({ width: 800, height: 460 })
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const behavior = useRef(zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 40]))
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

  return {
    svg, width, height, transform,
    projection: projectPoints(points, width, height, 64),
    zoomIn: () => select(svg.current!).call(behavior.current.scaleBy, 1.4),
    zoomOut: () => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4),
    reset: () => select(svg.current!).call(behavior.current.transform, zoomIdentity),
  }
}

export type GeometryViewport = ReturnType<typeof useGeometryViewport>
