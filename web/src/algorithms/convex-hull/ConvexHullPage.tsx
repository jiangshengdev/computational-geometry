import { useLingui } from '@lingui/react/macro'
import { DocumentTitle } from '../../app/DocumentTitle'
import { useLingui as useMessages } from '@lingui/react'
import { useJsonComputation } from '../../geometry/useJsonComputation'
import { useParams } from 'react-router'
import { buttonVariants } from '@heroui/react/button'
import { Alert } from '@heroui/react/alert'
import { Spinner } from '@heroui/react/spinner'
import { AppLink } from '../../app/AppLink'
import type { Point } from '../../geometry/geometry'
import { hullCases, type HullCase } from './cases'
import { ConvexHullPlot } from './ConvexHullPlot'
import { ConvexHullView } from './ConvexHullView'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { usePointInteraction } from '../../geometry/usePointInteraction'
import { CaseCatalog } from '../../geometry/CaseCatalog'
import { CaseToolbar } from '../../geometry/CaseToolbar'
import { HullLearning } from './HullLearning'
import { StartLearningLink } from '../../geometry/StartLearningLink'

export function ConvexHullPage() {
  const { t } = useLingui()
  return <>
    <DocumentTitle title={`${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <CaseCatalog label={t`Convex hull cases`} title={t`Convex hull`} subtitle={t`Andrew monotone chain algorithm`} basePath="/convex-hull" cases={hullCases} idPrefix="hull" renderPreview={preset => <ConvexHullPlot points={preset.points} preview />} learningHref={preset => `/convex-hull/cases/${preset.id}/learn`} />
  </>
}

function decodeHull(data: unknown): Point[] {
  const { vertices } = data as { vertices: Point[] }
  if (!Array.isArray(vertices)) throw new Error('Invalid result structure')
  return vertices
}

function HullCaseViewer({ preset }: { preset: HullCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const computation = useJsonComputation('/api/convex-hull', JSON.stringify({ points: preset.points }), decodeHull)
  const interaction = usePointInteraction()
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <CaseToolbar name={translate(preset.name)} description={translate(preset.description)} backTo="/convex-hull"
      trailingAction={<StartLearningLink to={`/convex-hull/cases/${preset.id}/learn`} />} />
    <div className="workspace result-workspace" onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
      <ConvexHullView points={preset.points} vertices={computation.status === 'ready' ? computation.result : []} interaction={interaction} />
        <PointCoordinates title={t`Input points`} points={preset.points} prefix="P" interaction={interaction} />
        <PointCoordinates title={t`Hull vertices`} points={computation.status === 'ready' ? computation.result : undefined} prefix="V" interaction={interaction}>
          {computation.status === 'loading' ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>
            : computation.status === 'error' ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${computation.message}`}</Alert.Description></Alert.Content></Alert>
              : null}
        </PointCoordinates>
    </div>
  </>
}

export function ConvexHullCasePage({ learning = false }: { learning?: boolean }) {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = hullCases.find(candidate => candidate.id === caseId)
  return preset ? learning ? <HullLearning key={preset.id} preset={preset} /> : <HullCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Convex hull`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm', className: 'self-start' })} to="/convex-hull">{t`Back to cases`}</AppLink>
  </>
}
