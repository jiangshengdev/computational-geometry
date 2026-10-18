import { Card } from '@heroui/react/card'
import { useLingui } from '@lingui/react/macro'
import { DocumentTitle } from '../../app/DocumentTitle'
import { useLingui as useMessages } from '@lingui/react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, buttonVariants } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { Spinner } from '@heroui/react/spinner'
import { AppLink } from '../../app/AppLink'
import { PageHeading } from '../../app/PageHeading'
import type { Point } from '../../geometry/geometry'
import { hullCases, type HullCase } from './cases'
import { ConvexHullPlot } from './ConvexHullPlot'
import { ConvexHullView } from './ConvexHullView'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { usePointInteraction } from '../../geometry/usePointInteraction'
import { Modal } from '@heroui/react/modal'
import { X } from 'lucide-react'

export function ConvexHullPage() {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const navigate = useNavigate()
  return <section aria-label={t`Convex hull cases`}>
    <DocumentTitle title={`${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <PageHeading title={t`Convex hull`} subtitle={t`Andrew monotone chain algorithm`} />
    <div className="case-list grid gap-4">{hullCases.map(preset => <article key={preset.id} aria-labelledby={`hull-${preset.id}`}><Card className="case-card h-full items-stretch">
      <AppLink className="case-thumbnail-link" to={`/convex-hull/cases/${preset.id}`} aria-label={t`View ${translate(preset.name)} details`}><ConvexHullPlot points={preset.points} preview /></AppLink>
      <div className="flex min-w-0 flex-1 flex-col gap-3"><Card.Header className="gap-1"><Card.Title id={`hull-${preset.id}`} render={props => <h2 {...props} />}>{translate(preset.name)}</Card.Title><Card.Description>{translate(preset.description)}</Card.Description></Card.Header>
        <Card.Footer className="mt-auto justify-end"><Button variant="secondary" onPress={() => navigate(`/convex-hull/cases/${preset.id}`)}>{t`View details`}</Button></Card.Footer></div>
    </Card></article>)}</div>
  </section>
}

type HullComputation = { status: 'loading' } | { status: 'ready'; vertices: Point[] } | { status: 'error'; message: string }

function HullCaseViewer({ preset }: { preset: HullCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const [computation, setComputation] = useState<HullComputation>({ status: 'loading' })
  const interaction = usePointInteraction()
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
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <div className="case-toolbar">
      <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/convex-hull">{t`Back to cases`}</AppLink>
      <h1 className="text-xl font-semibold">{translate(preset.name)}</h1>
      <div className="case-actions flex items-center gap-3">
        <Modal>
          <Button variant="tertiary" size="sm">{t`About this case`}</Button>
          <Modal.Backdrop>
            <Modal.Container scroll="inside">
              <Modal.Dialog>
                <Modal.CloseTrigger aria-label={t`Close help`}><X size={16} aria-hidden="true" /></Modal.CloseTrigger>
                <Modal.Header><Modal.Heading>{t`About this case`}</Modal.Heading></Modal.Header>
                <Modal.Body className="flex flex-col gap-3">
                  <h2 className="font-semibold">{translate(preset.name)}</h2>
                  <p>{translate(preset.description)}</p>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    </div>
    {computation.status === 'loading' ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>
      : computation.status === 'error' ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${computation.message}`}</Alert.Description></Alert.Content></Alert>
        : null}
    <div className="workspace result-workspace" onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
      <ConvexHullView points={preset.points} vertices={computation.status === 'ready' ? computation.vertices : []} interaction={interaction} />
        <PointCoordinates title={t`Input points`} points={preset.points} prefix="P" interaction={interaction} />
        {computation.status === 'ready' && <PointCoordinates title={t`Hull vertices`} points={computation.vertices} prefix="V" interaction={interaction} />}
    </div>
  </>
}

export function ConvexHullCasePage() {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = hullCases.find(candidate => candidate.id === caseId)
  return preset ? <HullCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Convex hull`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm', className: 'self-start' })} to="/convex-hull">{t`Back to cases`}</AppLink>
  </>
}
