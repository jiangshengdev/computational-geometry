import { Card } from '@heroui/react/card'
import { Button, buttonVariants } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { Spinner } from '@heroui/react/spinner'
import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AppLink } from '../../app/AppLink'
import { DocumentTitle } from '../../app/DocumentTitle'
import { PageHeading } from '../../app/PageHeading'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { polygonCases, type PolygonCase } from './cases'
import { PolygonPlot } from './PolygonPlot'
import { resultPoints, type PolygonIntersection } from './result'
import './polygon.css'

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

type Computation = { status: 'loading' } | { status: 'ready'; result: PolygonIntersection } | { status: 'error'; message: string }

function PolygonCaseViewer({ preset }: { preset: PolygonCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch('/api/convex-polygon-intersection', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first: preset.first, second: preset.second }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json() as PolygonIntersection
        if (!controller.signal.aborted) setComputation({ status: 'ready', result })
      } catch (error) {
        if (!controller.signal.aborted) setComputation({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void compute()
    return () => controller.abort()
  }, [preset])
  const result = computation.status === 'ready' ? computation.result : undefined
  const kindLabels = { empty: t`Empty intersection`, point: t`Point intersection`, segment: t`Segment intersection result`, polygon: t`Convex polygon intersection result` }
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Convex polygon intersection`} · ${t`Computational Geometry`}`} />
    <div className="case-toolbar">
      <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/convex-polygon-intersection">{t`Back to cases`}</AppLink>
      <h1 className="text-xl font-semibold">{translate(preset.name)}</h1>
      <p>{translate(preset.description)}</p>
    </div>
    {computation.status === 'loading' ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>
      : computation.status === 'error' ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${computation.message}`}</Alert.Description></Alert.Content></Alert>
        : <p role="status">{kindLabels[computation.result.kind]}</p>}
    <div className="workspace result-workspace polygon-workspace">
      <div className="drawing"><Card>
        <Card.Header className="drawing-toolbar"><Card.Title render={props => <h2 {...props} />}>{t`Original coordinate plane · Equal scale`}</Card.Title></Card.Header>
        <Card.Content className="flex min-h-0 flex-1 flex-col">
          <p className="polygon-legend"><span>{t`Polygon A · solid boundary`}</span><span>{t`Polygon B · dashed boundary`}</span><span>{t`Intersection · filled region or contact`}</span></p>
          <div className="drawing-surface flex flex-col"><PolygonPlot first={preset.first} second={preset.second} result={result} /></div>
        </Card.Content>
      </Card></div>
      <div className="input-panel polygon-inputs">
        <PointCoordinates title={t`Polygon A vertices`} points={preset.first} prefix="A" panel="input" />
        <PointCoordinates title={t`Polygon B vertices`} points={preset.second} prefix="B" panel="input" />
      </div>
      {result && result.kind !== 'empty' && <PointCoordinates title={t`Intersection coordinates`} points={resultPoints(result)} prefix="R" panel="result" />}
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
