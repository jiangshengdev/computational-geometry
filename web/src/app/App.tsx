import { Route, Routes, useMatch } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { CaseList, CasePage, RouteError } from '../algorithms/segment-intersection/bo/BoPages'
import { DocumentationLink } from './DocumentationLink'
import { LanguageSelect } from './LanguageProvider'
import { AlgorithmHome } from './AlgorithmHome'
import { ConvexHullCasePage, ConvexHullPage } from '../algorithms/convex-hull/ConvexHullPage'
import { AppLink } from './AppLink'
import { DocumentTitle } from './DocumentTitle'
import { Alert } from '@heroui/react/alert'
import './App.css'
import { PageHeading } from './PageHeading'

export default function App() {
  const { t } = useLingui()
  const caseRoute = useMatch('/bo/cases/:caseId/*')
  const hullCaseRoute = useMatch('/convex-hull/cases/:caseId')
  const boList = useMatch('/bo')
  return <main className={caseRoute || hullCaseRoute ? 'case-shell' : undefined}>
    {!caseRoute && !hullCaseRoute && <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <AppLink to="/">{t`Algorithm home`}</AppLink>
      <div className="flex items-center gap-3"><DocumentationLink /><LanguageSelect /></div>
    </div>}
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
      <Route path="*" element={<>
        <DocumentTitle title={`${t`Invalid link`} · ${t`Computational Geometry`}`} />
        <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{t`Unknown page path.`}</Alert.Description></Alert.Content></Alert>
      </>} />
    </Routes>
  </main>
}
