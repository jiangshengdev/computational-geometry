import { Card } from '@heroui/react/card'
import { Button, buttonVariants } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { useJsonComputation } from '../../geometry/useJsonComputation'
import { useNavigate, useParams } from 'react-router'
import { AppLink } from '../../app/AppLink'
import { DocumentTitle } from '../../app/DocumentTitle'
import { PageHeading } from '../../app/PageHeading'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { polygonCases, type PolygonCase } from './cases'
import { PolygonPlot } from './PolygonPlot'
import { resultPoints, type PolygonIntersection } from './result'
import './polygon.css'
import { usePointInteraction } from '../../geometry/usePointInteraction'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import { GeometryInfo } from '../../geometry/GeometryInfo'
import { CaseDescription } from '../../geometry/CaseDescription'

export function PolygonPage() {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const navigate = useNavigate()
  return <section aria-label={t`Convex polygon intersection cases`}>
    <DocumentTitle title={`${t`Convex polygon intersection`} · ${t`Computational Geometry`}`} />
    <PageHeading title={t`Convex polygon intersection`} subtitle="Edge Chasing" />
    <div className="case-list grid gap-4">{polygonCases.map(preset => <article key={preset.id} aria-labelledby={`polygon-${preset.id}`}>
      <Card className="case-card h-full items-stretch">
        <AppLink className="case-thumbnail-link" to={`/convex-polygon-intersection/cases/${preset.id}`} aria-label={t`View ${translate(preset.name)} details`}><PolygonPlot first={preset.first} second={preset.second} preview /></AppLink>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Card.Header className="gap-1"><Card.Title id={`polygon-${preset.id}`} render={props => <h2 {...props} />}>{translate(preset.name)}</Card.Title><Card.Description>{translate(preset.description)}</Card.Description></Card.Header>
          <Card.Footer className="mt-auto justify-end"><Button variant="secondary" onPress={() => navigate(`/convex-polygon-intersection/cases/${preset.id}`)}>{t`View details`}</Button></Card.Footer>
        </div>
      </Card>
    </article>)}</div>
  </section>
}

const decodeIntersection = (data: unknown) => data as PolygonIntersection

function PolygonCaseViewer({ preset }: { preset: PolygonCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const computation = useJsonComputation('/api/convex-polygon-intersection', JSON.stringify({ first: preset.first, second: preset.second }), decodeIntersection)
  const interaction = usePointInteraction()
  const viewport = useGeometryViewport([...preset.first, ...preset.second], { padding: 36 })
  const result = computation.status === 'ready' ? computation.result : undefined
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Convex polygon intersection`} · ${t`Computational Geometry`}`} />
    <div className="case-toolbar">
      <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/convex-polygon-intersection">{t`Back to cases`}</AppLink>
      <h1 className="text-xl font-semibold">{translate(preset.name)}</h1>
      <div className="case-actions flex items-center gap-3">
        <CaseDescription name={translate(preset.name)} description={translate(preset.description)} />
      </div>
    </div>
    <div className="workspace result-workspace polygon-workspace" onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
      <div className="drawing"><Card>
        <Card.Header className="drawing-toolbar"><div className="flex items-center gap-1">
          <Card.Title render={props => <h2 {...props} />}>{t`Original coordinate plane · Equal scale`}</Card.Title>
          <GeometryInfo>
            <span className="text-accent">{t`Polygon A · solid boundary`}</span>
            <span className="text-warning">{t`Polygon B · dashed boundary`}</span>
            <span className="text-success">{t`Intersection · filled region or contact`}</span>
            <span>{t`Use buttons to zoom · Drag to pan`}</span>
          </GeometryInfo>
        </div><GeometryViewControls {...viewport} /></Card.Header>
        <Card.Content className="flex min-h-0 flex-1 flex-col">
          <div className="drawing-surface flex flex-col"><PolygonPlot first={preset.first} second={preset.second} result={result} viewport={viewport} interaction={interaction} /></div>
        </Card.Content>
      </Card></div>
      <div className="input-panel polygon-inputs">
        <PointCoordinates title={t`Polygon A vertices`} points={preset.first} prefix="A" panel="input" interaction={interaction} />
        <PointCoordinates title={t`Polygon B vertices`} points={preset.second} prefix="B" panel="input" interaction={interaction} />
      </div>
      {result && <PointCoordinates title={t`Intersection coordinates`} points={resultPoints(result)} prefix="R" panel="result" interaction={interaction} />}
    </div>
  </>
}

export function PolygonCasePage() {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = polygonCases.find(candidate => candidate.id === caseId)
  return preset ? <PolygonCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Convex polygon intersection`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm', className: 'self-start' })} to="/convex-polygon-intersection">{t`Back to cases`}</AppLink>
  </>
}
