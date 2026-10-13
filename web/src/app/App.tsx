import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Route, Routes, useMatch, useNavigate, useParams, useSearchParams } from 'react-router'
import { GeometryView } from '../geometry/GeometryView'
import { CaseThumbnail } from '../cases/CaseThumbnail'
import { formatGeometry, formatPoint, pairName, type Intersection } from '../geometry/geometry'
import { type Preset } from '../cases/preset'
import { type SweepTrace } from '../learning/trace'
import { useComputation } from './useComputation'
import { LearningView } from '../learning/LearningView'
import { CaseHelp, HelpButton } from '../help/CaseHelp'
import { presets } from '../cases/presets'
import { hoverHighlights, useHoverTarget } from '../geometry/hover'
import './App.css'
import { Alert } from '@heroui/react/alert'
import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { Separator } from '@heroui/react/separator'
import { Spinner } from '@heroui/react/spinner'
import { ToggleButton } from '@heroui/react/toggle-button'
import { ToggleButtonGroup } from '@heroui/react/toggle-button-group'
import { Button, buttonVariants } from '@heroui/react/button'
import { Input } from '@heroui/react/input'
import { usePageShortcut } from './usePageShortcut'
import { AppLink as Link } from './AppLink'
import { Switch } from '@heroui/react/switch'
import { Label } from '@heroui/react/label'
import { useLayoutPreference } from './useLayoutPreference'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { isLearningLayout, learningLayouts, type LearningLayout } from '../learning/learningLayout'
import { useLingui, Plural } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { LanguageSelect } from './LanguageProvider'

function PageTitle({ page, preset }: { page: string; preset?: Preset }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const title = `${preset ? `${translate(preset.name)} · ` : ''}${page} · ${t`BO Results Viewer`}`
  useEffect(() => { document.title = title }, [title])
  return null
}

function CaseViewer({ preset, learning, zenMode, layout }: { preset: Preset; learning: boolean; zenMode: boolean; layout: LearningLayout }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const computation = useComputation(preset, learning)
  const [selected, setSelected] = useState<Intersection | null>(null)
  const [hover, setHover] = useHoverTarget()
  const detailsRef = useRef<HTMLElement>(null)
  const [detailsScrollable, setDetailsScrollable] = useState(false)
  useEffect(() => {
    const element = detailsRef.current
    if (!element) return
    const measure = () => setDetailsScrollable(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // Content can grow without changing the constrained scrollport size.
    for (const child of element.children) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [selected, learning])
  const results = computation.status === 'ready' ? computation.results : []
  const highlights = hover ? hoverHighlights(hover, results) : null
  const errorMessage = computation.status === 'error' ? typeof computation.message === 'string' ? computation.message : translate(computation.message) : ''
  if (learning) return <>
    {computation.status !== 'ready' && <PageTitle page={t`Step-by-step learning`} preset={preset} />}
    {computation.status === 'loading'
      ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Loading the execution trace…`}</div>
      : computation.status === 'error'
        ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${errorMessage}`}</Alert.Description></Alert.Content></Alert>
        : computation.trace && <LearningPage preset={preset} trace={computation.trace} complete={computation.complete} zenMode={zenMode} layout={layout} />}
  </>
  return <>
    <PageTitle page={t`Results`} preset={preset} />
    <div className="workspace result-workspace">
      <GeometryView segments={preset.segments} results={results} selected={selected} highlights={highlights} onHover={setHover} />
      <aside className="workspace-panel result-panel" aria-label={t`Results`}>
        <Card>
          <Card.Header className="flex flex-row flex-wrap items-start justify-between gap-2"><div><Card.Title render={props => <h2 {...props} />}>{t`Intersecting pairs`}</Card.Title><Card.Description>{t`Select a pair to inspect its exact intersection.`}</Card.Description></div><HelpButton topic="results">{t`About results`}</HelpButton></Card.Header>
          <Card.Content className="result-content flex flex-col gap-4">
            {computation.status === 'loading'
              ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />{t`Computing…`}</div>
              : computation.status === 'error'
                ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Computation failed`}</Alert.Title><Alert.Description>{t`Please check the local service. ${errorMessage}`}</Alert.Description></Alert.Content></Alert>
                : <><div role="status" className="flex"><Chip><Plural value={results.length} one="# intersecting pair" other="# intersecting pairs" /></Chip></div>
                  {results.length === 0
                    ? <p className="py-6 text-center text-muted">{t`No intersecting pairs`}</p>
                    : <ScrollShadow className="pair-scroll" onKeyDownCapture={event => {
                      if (event.key !== 'Home' && event.key !== 'End') return
                      if (!(event.target instanceof Element)) return
                      const group = event.target.closest('[role="radiogroup"]')
                      if (!group || !event.currentTarget.contains(group)) return
                      const options = group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled):not([aria-disabled="true"])')
                      if (!Array.from(options).some(option => option.contains(event.target as Node))) return
                      event.preventDefault()
                      const target = event.key === 'Home' ? options[0] : options[options.length - 1]
                      target.focus()
                    }}>
                      <ToggleButtonGroup selectionMode="single" orientation="vertical" isDetached className="w-full gap-1 p-1" aria-label={t`Select an intersecting pair`}
                        selectedKeys={selected ? [pairName(selected)] : []}
                        onSelectionChange={keys => setSelected(results.find(result => keys.has(pairName(result))) ?? null)}>
                        {results.map(result => <ToggleButton key={pairName(result)} id={pairName(result)} className="pair-item w-full justify-start"
                          data-highlighted={highlights ? highlights.pairs.includes(pairName(result)) : result === selected}
                          onHoverStart={() => setHover({ kind: 'pair', pair: pairName(result) })} onHoverEnd={() => setHover(null)}>
                          <span className="coordinates">{pairName(result)}</span> · {result.geometry.type === 'point' ? t`Point` : t`Overlap interval`}
                        </ToggleButton>)}
                      </ToggleButtonGroup>
                    </ScrollShadow>}
                </>}
            <Separator />
            <section ref={detailsRef} aria-label={t`Exact details`} className="result-details flex min-w-0 flex-col gap-3" tabIndex={detailsScrollable ? 0 : -1}>
              <Card.Title render={props => <h2 {...props} />}>{t`Exact details`}</Card.Title>
              {selected ? <><h3 className="coordinates">{pairName(selected)}</h3><p className="coordinates">{formatGeometry(selected.geometry)}</p>
                {selected.segments.map(i => <p key={i} className="coordinates">S{i}：{formatPoint(preset.segments[i].start)} → {formatPoint(preset.segments[i].end)}</p>)}
              </> : <p className="py-6 text-center text-sm text-muted">{t`Select a pair to inspect the intersection and both inputs.`}</p>}
            </section>
          </Card.Content>
        </Card>
      </aside>
    <section className="workspace-panel input-panel" aria-label={t`Original inputs`}><Card>
      <Card.Header className="flex flex-row flex-wrap items-start justify-between gap-2"><div><Card.Title render={props => <h2 {...props} />} className="flex items-center gap-2">{t`Original inputs`} <Chip>{preset.segments.length}</Chip></Card.Title><Card.Description>{t`Distinct identities and exact endpoints`}</Card.Description></div><HelpButton topic="inputs">{t`About inputs`}</HelpButton></Card.Header>
      <Card.Content>{preset.segments.length === 0
        ? <p className="py-6 text-center text-muted">{t`The input set is empty`}</p>
        : <ul className="flex flex-col gap-1">{preset.segments.map((s, i) =>
          <li key={i} className="input-item flex min-w-0 flex-wrap gap-3 text-sm"
            data-highlighted={highlights ? highlights.inputs.includes(i) : selected?.segments.includes(i) ?? false}
            onPointerEnter={() => setHover({ kind: 'input', index: i })} onPointerLeave={() => setHover(null)}>
            <strong className="coordinates">S{i}</strong><span className="coordinates">{formatPoint(s.start)} → {formatPoint(s.end)}</span></li>)}</ul>}
      </Card.Content>
    </Card>
    </section>
    </div>
  </>
}

function CaseList() {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  return <section aria-label={t`Cases`} className="case-list grid gap-4">
    <PageTitle page={t`Cases`} />
    {presets.map(preset => <article key={preset.id} aria-labelledby={`case-${preset.id}`}>
      <Card className="case-card h-full items-stretch">
        <Link className="case-thumbnail-link" to={`/cases/${preset.id}`} aria-label={t`View ${translate(preset.name)} details`}>
          <CaseThumbnail name={translate(preset.name)} segments={preset.segments} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Card.Header className="gap-1">
            <Card.Title render={props => <h2 {...props} />} id={`case-${preset.id}`}>{translate(preset.name)}</Card.Title>
            <Card.Description>{translate(preset.description)}</Card.Description>
          </Card.Header>
          <Card.Footer className="mt-auto flex flex-wrap justify-end gap-3">
            {preset.learning && <Link className={buttonVariants()} to={`/cases/${preset.id}/learn`}>{t`Start learning`}</Link>}
            <Link className={buttonVariants({ variant: 'secondary' })} to={`/cases/${preset.id}`}>{t`View details`}</Link>
          </Card.Footer>
        </div>
      </Card>
    </article>)}
  </section>
}

function LearningPage({ preset, trace, complete, zenMode, layout }: { preset: Preset; trace: SweepTrace; complete: boolean; zenMode: boolean; layout: LearningLayout }) {
  const { t } = useLingui()
  const [search, setSearch] = useSearchParams()
  const [preview, setPreview] = useState<{ search: URLSearchParams; index: number } | null>(null)
  const [cursor, setCursor] = useState(0)
  const [destination, setDestination] = useState('')
  const [nextEntry, setNextEntry] = useState<{ search: URLSearchParams; from: number } | null>(null)
  const waitingEntry = nextEntry?.search === search ? nextEntry : null
  const arrivedEntry = waitingEntry ? trace.steps.findIndex((step, position) => position > waitingEntry.from && step.execution.entry) : -1
  useEffect(() => {
    if (!waitingEntry || preview?.search === search || (arrivedEntry < 0 && !complete)) return
    if (arrivedEntry >= 0) {
      const updated = new URLSearchParams(search)
      updated.set('step', String(arrivedEntry))
      setSearch(updated, { replace: true })
    }
  }, [arrivedEntry, complete, preview, search, setSearch, waitingEntry])
  const values = search.getAll('step')
  const value = values[0]
  if (values.length > 1 || (value !== undefined && !/^[0-9]+$/.test(value))) {
    return <RouteError message={t`Invalid learning step: use a nonnegative integer and provide only one step parameter.`} preset={preset} showListLink={false} />
  }
  const index = value === undefined ? 0 : Number(value)
  if (!Number.isSafeInteger(index) || (complete && index >= trace.steps.length)) {
    return <RouteError message={t`Learning step out of range: valid steps for this case are 0–${trace.steps.length - 1}.`} preset={preset} showListLink={false} />
  }
  const visibleIndex = preview?.search === search ? preview.index : index < trace.steps.length ? index : cursor
  const waiting = index >= trace.steps.length || Boolean(waitingEntry && (!complete || arrivedEntry >= 0))
  const changeStep = (next: number) => {
    setPreview(null)
    setNextEntry(null)
    setCursor(visibleIndex)
    if (next === index) return
    const updated = new URLSearchParams(search)
    updated.set('step', String(next))
    setSearch(updated, { replace: true })
  }
  return <><PageTitle page={t`Step-by-step learning`} preset={preset} /><LearningView preset={preset} trace={trace} zenMode={zenMode} layout={layout}
    complete={complete} index={visibleIndex} onWaitNextEntry={() => setNextEntry({ search, from: visibleIndex })}
    onStepPreview={next => setPreview({ search, index: next })} onStepChange={changeStep}>
    {waiting && <div role="status" aria-label={t`Waiting for a step`} className="flex flex-wrap items-center gap-3">
      <span>{waitingEntry ? t`Waiting for the next major step. Steps 0–${trace.steps.length - 1} are available to explore.` : t`Waiting for step ${index}. Steps 0–${trace.steps.length - 1} are available to explore.`}</span>
      <Button variant="secondary" onPress={() => changeStep(visibleIndex)}>{t`Cancel waiting`}</Button>
    </div>}
    <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
      event.preventDefault()
      const target = Number(destination)
      if (destination && Number.isSafeInteger(target) && target >= 0) changeStep(target)
    }}>
      <Input aria-label={t`Jump to step`} placeholder={t`Step`} className="w-28" type="number" min="0" step="1" required value={destination} onChange={event => setDestination(event.target.value)} />
      <Button variant="secondary" size="sm" type="submit">{t`Go to step`}</Button>
    </form></LearningView>
  </>
}

function RouteError({ message, preset, showListLink = true }: { message: string; preset?: Preset; showListLink?: boolean }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  return <section className="flex flex-col gap-4">
    <PageTitle page={preset ? t`Invalid link · ${translate(preset.name)}` : t`Invalid link`} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Invalid link`}</Alert.Title><Alert.Description>{message}</Alert.Description></Alert.Content></Alert>
    <nav aria-label={t`Recovery navigation`} className="flex flex-wrap gap-3">
      {showListLink && <Link className={buttonVariants({ variant: 'outline' })} to="/">{t`Back to cases`}</Link>}
      {preset && <Link className={buttonVariants({ variant: 'outline' })} to={`/cases/${preset.id}`}>{t`View details`}</Link>}
      {preset?.learning && <Link className={buttonVariants()} to={`/cases/${preset.id}/learn`}>{t`Learn from the start`}</Link>}
    </nav>
  </section>
}

function CasePage({ learning = false, unknownPath = false }: { learning?: boolean; unknownPath?: boolean }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const { caseId } = useParams()
  const navigate = useNavigate()
  const preset = presets.find(item => item.id === caseId)
  const [zenMode, setZenMode] = useLayoutPreference('bo-learning-layout-v1-zen', false,
    (value): value is boolean => typeof value === 'boolean')
  const [layout, setLayout] = useLayoutPreference<LearningLayout>('bo-learning-layout-v1-columns', '2:3:3', isLearningLayout)
  usePageShortcut(event => {
    if (learning && !unknownPath && preset?.learning && event.key === 'z') {
      event.preventDefault()
      if (!event.repeat) setZenMode(!zenMode)
      return
    }
    if (learning || unknownPath || !preset?.learning || event.key !== 'ArrowRight') return
    event.preventDefault()
    if (!event.repeat) navigate(`/cases/${preset.id}/learn`)
  })
  if (!preset || unknownPath || (learning && !preset.learning)) return <>
    <div className="flex justify-end"><LanguageSelect /></div>
    <RouteError message={!preset ? t`Unknown case: ${caseId}` : unknownPath ? t`Unknown page path.` : t`This case does not support learning.`} preset={preset} />
  </>
  return <CaseHelp key={`${preset.id}:${learning}`} preset={preset}>
    <div className="case-toolbar">
      <nav aria-label={t`Page navigation`}><Link className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/">{t`Back to cases`}</Link></nav>
      <h2 className="text-xl font-semibold">{translate(preset.name)}</h2>
      <div className="case-actions flex flex-wrap items-center gap-2">
        <LanguageSelect />
        {learning && <Select className="learning-layout-select w-24" aria-label={t`Main layout ratio (geometry, code, variables)`} value={layout}
          onChange={value => { if (isLearningLayout(value)) setLayout(value) }}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>
            {Object.keys(learningLayouts).map(ratio => <ListBox.Item key={ratio} id={ratio} textValue={ratio}>
              {ratio}<ListBox.ItemIndicator />
            </ListBox.Item>)}
          </ListBox></Select.Popover>
        </Select>}
        {learning && <Switch size="sm" isSelected={zenMode} onChange={setZenMode}
          inputRef={input => { input?.setAttribute('aria-keyshortcuts', 'z') }}>
          <Switch.Content>
            <Switch.Control><Switch.Thumb /></Switch.Control>
            <Label>{t`Zen mode`}</Label><Chip color="accent" variant="soft" size="sm" aria-hidden="true">Z</Chip>
          </Switch.Content>
        </Switch>}
        <HelpButton /><HelpButton topic="case">{t`About this case`}</HelpButton>
        {learning
          ? <Link className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={`/cases/${preset.id}`}>{t`Back to results viewer`}</Link>
          : preset.learning && <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2' })} to={`/cases/${preset.id}/learn`} aria-keyshortcuts="ArrowRight">{t`Start step-by-step learning`}<Chip color="accent" variant="soft" size="sm" className="bg-white/20 text-white" aria-hidden="true"><ArrowRight size={14} /></Chip></Link>}
      </div>
    </div>
    <CaseViewer preset={preset} learning={learning} zenMode={zenMode} layout={layout} />
  </CaseHelp>
}

export default function App() {
  const { t } = useLingui()
  const caseRoute = useMatch('/cases/:caseId/*')
  return <main className={caseRoute ? 'case-shell' : undefined}>
    {!caseRoute && <div className="flex justify-end"><LanguageSelect /></div>}
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
