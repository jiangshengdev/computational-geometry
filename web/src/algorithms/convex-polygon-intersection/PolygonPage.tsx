import { Card } from '@heroui/react/card'
import { buttonVariants } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { useJsonComputation } from '../../geometry/useJsonComputation'
import { useParams } from 'react-router'
import { AppLink } from '../../app/AppLink'
import { DocumentTitle } from '../../app/DocumentTitle'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { polygonCases, type PolygonCase } from './cases'
import { PolygonPlot } from './PolygonPlot'
import { resultPoints, type PolygonIntersection } from './result'
import './polygon.css'
import { usePointInteraction } from '../../geometry/usePointInteraction'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import { GeometryInfo } from '../../geometry/GeometryInfo'
import { CaseCatalog } from '../../geometry/CaseCatalog'
import { CaseToolbar } from '../../geometry/CaseToolbar'
import { PolygonLearning } from './PolygonLearning'

export function PolygonPage() {
  const { t } = useLingui()
  return <>
    <DocumentTitle title={`${t`Convex polygon intersection`} · ${t`Computational Geometry`}`} />
    <CaseCatalog label={t`Convex polygon intersection cases`} title={t`Convex polygon intersection`} subtitle="Edge Chasing" basePath="/convex-polygon-intersection" cases={polygonCases} idPrefix="polygon" renderPreview={preset => <PolygonPlot first={preset.first} second={preset.second} preview />} />
  </>
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
    <CaseToolbar name={translate(preset.name)} description={translate(preset.description)} backTo="/convex-polygon-intersection"
      trailingAction={<AppLink className={buttonVariants({ variant: 'primary', size: 'sm' })} to={`/convex-polygon-intersection/cases/${preset.id}/learn`}>{t`Start step-by-step learning`}</AppLink>} />
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

export function PolygonCasePage({ learning = false }: { learning?: boolean }) {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = polygonCases.find(candidate => candidate.id === caseId)
  return preset ? learning ? <PolygonLearning key={preset.id} preset={preset} /> : <PolygonCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Convex polygon intersection`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm', className: 'self-start' })} to="/convex-polygon-intersection">{t`Back to cases`}</AppLink>
  </>
}
