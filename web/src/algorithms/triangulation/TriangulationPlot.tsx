import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import { PlotPoints } from '../../geometry/PlotPoints'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import { triangleVertices, type Triangle } from './result'
import type { TriangleInteraction } from './useTriangleInteraction'

export function TriangulationPlot({ vertices, triangles = [], preview = false, viewport, interaction, triangleInteraction }: {
  vertices: Point[]; triangles?: Triangle[]; preview?: boolean
  viewport?: GeometryViewport; interaction?: PointInteraction
  triangleInteraction?: TriangleInteraction
}) {
  const { t } = useLingui()
  const width = viewport?.width ?? 160, height = viewport?.height ?? 120
  const projection = viewport?.projection ?? projectPoints(vertices, width, height, 16)
  const path = (points: Point[]) => points.map(point => `${projection!.px(point)},${projection!.py(point)}`).join(' ')
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'}
    viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'}
    aria-label={preview ? t`Input polygon preview` : t`Triangulation plot`}
    onPointerDown={() => { interaction?.hover(null); triangleInteraction?.hover(null) }}>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      <polygon data-input="boundary" points={path(vertices)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth={2} />
      {triangles.map((triangle, index) => {
        const highlighted = triangleInteraction?.active?.index === index
        const selected = triangleInteraction?.selected?.index === index
        const labels = triangleVertices(triangle)
        return <polygon key={index} data-triangle={index} data-highlighted={highlighted} data-selected={selected}
          role={triangleInteraction ? 'button' : undefined} tabIndex={triangleInteraction ? 0 : undefined}
          aria-label={triangleInteraction ? t`Triangle T${index}: ${labels}` : undefined} aria-pressed={triangleInteraction ? selected : undefined}
          onPointerEnter={event => { if (!event.buttons) triangleInteraction?.hover({ index, source: 'plot' }) }} onPointerLeave={() => triangleInteraction?.hover(null)}
          onFocus={() => triangleInteraction?.hover({ index, source: 'plot' })} onBlur={() => triangleInteraction?.hover(null)}
          onClick={() => triangleInteraction?.select({ index, source: 'plot' })}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); triangleInteraction?.select({ index, source: 'plot' }) } }}
          points={path(triangle.map(vertex => vertices[vertex]))} fill={highlighted ? 'var(--accent)' : 'var(--success)'} fillOpacity={highlighted || selected ? '0.4' : '0.15'} stroke={selected ? 'var(--accent)' : 'var(--success)'} strokeWidth={2} />
      })}
      <PlotPoints points={vertices} projection={projection} preview={preview} scale={viewport?.transform.k ?? 1} interaction={interaction} />
    </g>}
  </svg>
}
