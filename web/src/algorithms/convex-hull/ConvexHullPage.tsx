import { Card } from '@heroui/react/card'
import { useLingui } from '@lingui/react/macro'
import { DocumentTitle } from '../../app/DocumentTitle'
import { useLingui as useMessages } from '@lingui/react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { Spinner } from '@heroui/react/spinner'
import { AppLink } from '../../app/AppLink'
import { PageHeading } from '../../app/PageHeading'
import type { Point } from '../../geometry/geometry'
import { hullCases, type HullCase } from './cases'
import { ConvexHullPlot } from './ConvexHullPlot'
import { ConvexHullCoordinates } from './ConvexHullCoordinates'

export function ConvexHullPage() {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const navigate = useNavigate()
  return <section aria-label={t`Convex hull cases`} className="flex flex-col gap-4">
    <DocumentTitle title={`${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <PageHeading title={t`Convex hull`} description={t`Choose a fixed point set to inspect its exact convex hull.`} />
    <div className="case-list grid gap-4">{hullCases.map(preset => <article key={preset.id} aria-labelledby={`hull-${preset.id}`}><Card className="case-card h-full items-stretch">
      <AppLink className="case-thumbnail-link" to={`/convex-hull/cases/${preset.id}`} aria-label={t`View ${translate(preset.name)} details`}><ConvexHullPlot points={preset.points} preview /></AppLink>
      <div className="flex min-w-0 flex-1 flex-col gap-3"><Card.Header className="gap-1"><Card.Title id={`hull-${preset.id}`} render={props => <h2 {...props} />}>{translate(preset.name)}</Card.Title><Card.Description>{translate(preset.description)}</Card.Description></Card.Header>
        <Card.Footer className="mt-auto justify-end"><Button onPress={() => navigate(`/convex-hull/cases/${preset.id}`)}>{t`View details`}</Button></Card.Footer></div>
    </Card></article>)}</div>
  </section>
}

type HullComputation = { status: 'loading' } | { status: 'ready'; vertices: Point[] } | { status: 'error'; message: string }

function HullCaseViewer({ preset }: { preset: HullCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const [computation, setComputation] = useState<HullComputation>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch('/api/convex-hull', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: preset.points }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json() as { vertices: Point[] }
        if (!Array.isArray(data.vertices)) throw new Error('Invalid result structure')
        if (!controller.signal.aborted) setComputation({ status: 'ready', vertices: data.vertices })
      } catch (error) {
        if (!controller.signal.aborted) setComputation({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void compute()
    return () => controller.abort()
  }, [preset])
  return <section className="flex flex-col gap-4">
    <DocumentTitle title={`${translate(preset.name)} · ${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <AppLink to="/convex-hull">{t`Back to cases`}</AppLink>
    <PageHeading title={translate(preset.name)} description={translate(preset.description)} />
    {computation.status === 'loading' ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>
      : computation.status === 'error' ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${computation.message}`}</Alert.Description></Alert.Content></Alert>
        : <p role="status">{t`Input points: ${preset.points.length}; hull vertices: ${computation.vertices.length}`}</p>}
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] items-start gap-4">
      <Card><Card.Content><ConvexHullPlot points={preset.points} vertices={computation.status === 'ready' ? computation.vertices : []} /></Card.Content></Card>
      <div className="flex min-w-0 flex-col gap-4">
        <ConvexHullCoordinates title={t`Input points`} points={preset.points} prefix="P" />
        {computation.status === 'ready' && <ConvexHullCoordinates title={t`Hull vertices`} points={computation.vertices} prefix="V" />}
      </div>
    </div>
  </section>
}

export function ConvexHullCasePage() {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = hullCases.find(candidate => candidate.id === caseId)
  return preset ? <HullCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Convex hull`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink to="/convex-hull">{t`Back to cases`}</AppLink>
  </>
}
