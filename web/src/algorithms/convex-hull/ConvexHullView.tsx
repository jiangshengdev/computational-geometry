import { Card } from '@heroui/react/card'
import { Trans } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { ConvexHullPlot } from './ConvexHullPlot'
import type { HullInteraction } from './useHullInteraction'

export function ConvexHullView({ points, vertices, interaction }: { points: Point[]; vertices: Point[]; interaction: HullInteraction }) {
  const viewport = useGeometryViewport(points, { padding: 36 })
  return <div className="drawing"><Card>
    <Card.Header className="drawing-toolbar">
      <Card.Title render={props => <h2 {...props} />}><Trans>Original coordinate plane · Equal scale</Trans></Card.Title>
      <GeometryViewControls {...viewport} />
    </Card.Header>
    <Card.Content className="flex min-h-0 flex-1 flex-col"><div className="drawing-surface flex flex-col">
      <ConvexHullPlot points={points} vertices={vertices} interaction={interaction} viewport={viewport} />
    </div></Card.Content>
  </Card></div>
}
