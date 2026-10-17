import { Route, Routes, useMatch } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import { CaseList, CasePage, RouteError } from '../algorithms/bo/BoPages'
import { DocumentationLink } from './DocumentationLink'
import { LanguageSelect } from './LanguageProvider'
import './App.css'

export default function App() {
  const { t } = useLingui()
  const caseRoute = useMatch('/cases/:caseId/*')
  return <main className={caseRoute ? 'case-shell' : undefined}>
    {!caseRoute && <div className="flex items-center justify-end gap-3"><DocumentationLink /><LanguageSelect /></div>}
    {!caseRoute && <p className="mb-6 text-muted">{t`Choose a case to inspect exact intersection points and complete overlap intervals.`}</p>}
    <Routes>
      <Route path="/" element={<CaseList />} />
      <Route path="/cases/:caseId" element={<CasePage />} />
      <Route path="/cases/:caseId/learn" element={<CasePage learning />} />
      <Route path="/cases/:caseId/*" element={<CasePage unknownPath />} />
      <Route path="*" element={<RouteError message={t`Unknown page path.`} />} />
    </Routes>
  </main>
}
