import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import { PlotPoints } from '../../geometry/PlotPoints'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import type { Triangle } from './result'

export function TriangulationPlot({ vertices, triangles = [], preview = false, viewport, interaction }: {
  vertices: Point[]; triangles?: Triangle[]; preview?: boolean
  viewport?: GeometryViewport; interaction?: PointInteraction
}) {
  const { t } = useLingui()
  const width = viewport?.width ?? 160, height = viewport?.height ?? 120
  const projection = viewport?.projection ?? projectPoints(vertices, width, height, 16)
  const path = (points: Point[]) => points.map(point => `${projection!.px(point)},${projection!.py(point)}`).join(' ')
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'}
    viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'}
    aria-label={preview ? t`Input polygon preview` : t`Triangulation plot`}
    onPointerDown={() => interaction?.hover(null)}>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      <polygon data-input="boundary" points={path(vertices)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth={2} />
      {triangles.map((triangle, index) => <polygon key={index} data-triangle={index}
        points={path(triangle.map(vertex => vertices[vertex]))} fill="var(--success)" fillOpacity="0.15" stroke="var(--success)" strokeWidth={2} />)}
      <PlotPoints points={vertices} projection={projection} preview={preview} scale={viewport?.transform.k ?? 1} interaction={interaction} />
    </g>}
  </svg>
}
