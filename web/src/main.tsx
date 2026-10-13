import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './app/App.tsx'
import { PageScrollRestoration } from './app/PageScrollRestoration.tsx'
import { LanguageProvider } from './app/LanguageProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Step URLs must commit before the next keyboard or slider input. */}
    <LanguageProvider><BrowserRouter useTransitions={false}><PageScrollRestoration /><App /></BrowserRouter></LanguageProvider>
  </StrictMode>,
)
