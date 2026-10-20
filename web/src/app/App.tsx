import { Route, Routes, useMatch } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { CaseList, CasePage, RouteError } from '../algorithms/segment-intersection/bo/BoPages'
import { AppNavigation } from './AppNavigation'
import { AlgorithmHome } from './AlgorithmHome'
import { ConvexHullCasePage, ConvexHullPage } from '../algorithms/convex-hull/ConvexHullPage'
import { DocumentTitle } from './DocumentTitle'
import { Alert } from '@heroui/react/alert'
import './App.css'
import { PageHeading } from './PageHeading'
import { PolygonPage, PolygonCasePage } from '../algorithms/convex-polygon-intersection/PolygonPage'
import { TriangulationPage, TriangulationCasePage } from '../algorithms/triangulation/TriangulationPage'

export default function App() {
  const { t } = useLingui()
  const caseRoute = useMatch('/bo/cases/:caseId/*')
  const hullCaseRoute = useMatch('/convex-hull/cases/:caseId/*')
  const polygonCaseRoute = useMatch('/convex-polygon-intersection/cases/:caseId')
  const triangulationCaseRoute = useMatch('/triangulation/cases/:caseId')
  const boList = useMatch('/bo')
  return <>
    <AppNavigation />
    <main className={caseRoute || hullCaseRoute || polygonCaseRoute || triangulationCaseRoute ? 'case-shell' : undefined}>
      {boList && <PageHeading title={t`Segment intersection`} subtitle="Bentley–Ottmann" />}
      <Routes>
        <Route path="/" element={<AlgorithmHome />} />
        <Route path="/bo" element={<CaseList />} />
        <Route path="/bo/cases/:caseId" element={<CasePage />} />
        <Route path="/bo/cases/:caseId/learn" element={<CasePage learning />} />
        <Route path="/bo/cases/:caseId/*" element={<CasePage unknownPath />} />
        <Route path="/bo/*" element={<RouteError message={t`Unknown page path.`} />} />
        <Route path="/convex-hull" element={<ConvexHullPage />} />
        <Route path="/convex-hull/cases/:caseId" element={<ConvexHullCasePage />} />
        <Route path="/convex-hull/cases/:caseId/learn" element={<ConvexHullCasePage learning />} />
        <Route path="/convex-polygon-intersection" element={<PolygonPage />} />
        <Route path="/convex-polygon-intersection/cases/:caseId" element={<PolygonCasePage />} />
        <Route path="/triangulation" element={<TriangulationPage />} />
        <Route path="/triangulation/cases/:caseId" element={<TriangulationCasePage />} />
        <Route path="*" element={<>
          <DocumentTitle title={`${t`Invalid link`} · ${t`Computational Geometry`}`} />
          <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown page path.`}</Alert.Description></Alert.Content></Alert>
        </>} />
      </Routes>
    </main>
  </>
}
