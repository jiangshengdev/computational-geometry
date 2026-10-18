import { Card } from '@heroui/react/card'
import { Alert } from '@heroui/react/alert'
import { Spinner } from '@heroui/react/spinner'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { useParams } from 'react-router'
import { buttonVariants } from '@heroui/react/button'
import { AppLink } from '../../app/AppLink'
import { DocumentTitle } from '../../app/DocumentTitle'
import { CaseCatalog } from '../../geometry/CaseCatalog'
import { CaseToolbar } from '../../geometry/CaseToolbar'
import { useJsonComputation } from '../../geometry/useJsonComputation'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { usePointInteraction } from '../../geometry/usePointInteraction'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import { triangulationCases, type TriangulationCase } from './cases'
import { decodeTriangulation, triangleVertices } from './result'
import { TriangulationPlot } from './TriangulationPlot'

export function TriangulationPage() {
  const { t } = useLingui()
  return <>
    <DocumentTitle title={`${t`Triangulation`} · ${t`Computational Geometry`}`} />
    <CaseCatalog title={t`Triangulation`} label={t`Triangulation cases`} subtitle={t`Monotone decomposition`} basePath="/triangulation" cases={triangulationCases}
      renderPreview={preset => <TriangulationPlot vertices={preset.vertices} preview />} />
  </>
}

function TriangulationCaseViewer({ preset }: { preset: TriangulationCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const computation = useJsonComputation('/api/triangulation', JSON.stringify({ vertices: preset.vertices }), decodeTriangulation)
  const interaction = usePointInteraction()
  const viewport = useGeometryViewport(preset.vertices, { padding: 36 })
  const triangles = computation.status === 'ready' ? computation.result : undefined
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Triangulation`} · ${t`Computational Geometry`}`} />
    <CaseToolbar name={translate(preset.name)} description={translate(preset.description)} backTo="/triangulation" />
    <div className="workspace result-workspace" onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
      <div className="drawing"><Card>
        <Card.Header className="drawing-toolbar">
          <Card.Title render={props => <h2 {...props} />}>{t`Original coordinate plane · Equal scale`}</Card.Title>
          <GeometryViewControls {...viewport} />
        </Card.Header>
        <Card.Content className="flex min-h-0 flex-1 flex-col"><div className="drawing-surface flex flex-col">
          <TriangulationPlot vertices={preset.vertices} triangles={triangles} viewport={viewport} interaction={interaction} />
        </div></Card.Content>
      </Card></div>
      <PointCoordinates title={t`Input vertices`} points={preset.vertices} prefix="P" interaction={interaction} />
      <section aria-label={t`Triangles`} className="workspace-panel result-panel"><Card>
        <Card.Header><Card.Title render={props => <h2 {...props} />}>{t`Triangles`}</Card.Title></Card.Header>
        <Card.Content className="flex flex-col !overflow-hidden">
          {computation.status === 'loading' && <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>}
          {computation.status === 'error' && <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${computation.message}`}</Alert.Description></Alert.Content></Alert>}
          {triangles && <ScrollShadow className="pair-scroll" tabIndex={0} aria-label={t`Triangles`}><ol className="flex flex-col gap-1 p-1">
            {triangles.map((triangle, index) => <li key={index} className="coordinates"><strong>T{index}</strong>{' '}<span>{triangleVertices(triangle)}</span></li>)}
          </ol></ScrollShadow>}
        </Card.Content>
      </Card></section>
    </div>
  </>
}

export function TriangulationCasePage() {
  const { caseId } = useParams()
  const { t } = useLingui()
  const preset = triangulationCases.find(candidate => candidate.id === caseId)
  return preset ? <TriangulationCaseViewer key={preset.id} preset={preset} /> : <>
    <DocumentTitle title={`${t`Invalid link`} · ${t`Triangulation`}`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown case.`}</Alert.Description></Alert.Content></Alert>
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/triangulation">{t`Back to cases`}</AppLink>
  </>
}
