import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useMatch, useNavigate, useParams, useSearchParams } from 'react-router'
import { GeometryView } from './GeometryView'
import { CaseThumbnail } from './CaseThumbnail'
import { formatGeometry, formatPoint, pairName, type Intersection, type Preset, type SweepTrace } from './geometry'
import { LearningView } from './LearningView'
import { CaseHelp, HelpButton } from './CaseHelp'
import { presets } from './presets'
import { hoverHighlights, useHoverTarget } from './hover'
import './App.css'
import { Alert } from '@heroui/react/alert'
import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { Separator } from '@heroui/react/separator'
import { Spinner } from '@heroui/react/spinner'
import { ToggleButton } from '@heroui/react/toggle-button'
import { ToggleButtonGroup } from '@heroui/react/toggle-button-group'
import { buttonVariants } from '@heroui/react/button'
import { usePageShortcut } from './usePageShortcut'
import { AppLink as Link } from './AppLink'

type Computation = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; results: Intersection[]; trace?: SweepTrace }

function PageTitle({ page, preset }: { page: string; preset?: Preset }) {
  const title = `${preset ? `${preset.name} · ` : ''}${page} · BO 结果查看器`
  useEffect(() => { document.title = title }, [title])
  return null
}

function CaseViewer({ preset, learning }: { preset: Preset; learning: boolean }) {
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  const [selected, setSelected] = useState<Intersection | null>(null)
  const [hover, setHover] = useHoverTarget()
  const teachable = Boolean(preset.learning)
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
  useEffect(() => {
    let current = true
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch('/api/intersections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: preset.segments, trace: teachable }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json() as { intersections: Intersection[]; trace?: SweepTrace }
        if (!Array.isArray(data.intersections)) throw new Error('结果结构无效')
        if (teachable && !data.trace?.steps.length) throw new Error('教学轨迹无效')
        if (current) setComputation({ status: 'ready', results: data.intersections, trace: data.trace })
      } catch (error) {
        if (current) setComputation({ status: 'error', message: error instanceof Error ? error.message : '未知错误' })
      }
    }
    void compute()
    return () => { current = false; controller.abort() }
  }, [preset, teachable])
  const results = computation.status === 'ready' ? computation.results : []
  const highlights = hover ? hoverHighlights(hover, results) : null
  if (learning) return <>
    {computation.status !== 'ready' && <PageTitle page="逐步学习" preset={preset} />}
    {computation.status === 'loading'
      ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />正在加载教学轨迹…</div>
      : computation.status === 'error'
        ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>计算失败</Alert.Title><Alert.Description>请检查本地服务。{computation.message}</Alert.Description></Alert.Content></Alert>
        : computation.trace && <LearningPage preset={preset} trace={computation.trace} results={results} />}
  </>
  return <>
    <PageTitle page="计算结果" preset={preset} />
    <div className="workspace result-workspace">
      <GeometryView segments={preset.segments} results={results} selected={selected} highlights={highlights} onHover={setHover} />
      <aside className="workspace-panel result-panel" aria-label="计算结果">
        <Card>
          <Card.Header className="flex flex-row flex-wrap items-start justify-between gap-2"><div><Card.Title render={props => <h2 {...props} />}>相交配对</Card.Title><Card.Description>选择配对，查看精确交集。</Card.Description></div><HelpButton topic="results">结果说明</HelpButton></Card.Header>
          <Card.Content className="result-content flex flex-col gap-4">
            {computation.status === 'loading'
              ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />正在计算…</div>
              : computation.status === 'error'
                ? <Alert status="danger" role="alert"><Alert.Content><Alert.Title>计算失败</Alert.Title><Alert.Description>请检查本地服务。{computation.message}</Alert.Description></Alert.Content></Alert>
                : <><div role="status" className="flex"><Chip>{results.length} 个相交配对</Chip></div>
                  {results.length === 0
                    ? <p className="py-6 text-center text-muted">没有相交配对</p>
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
                      <ToggleButtonGroup selectionMode="single" orientation="vertical" isDetached className="w-full gap-1 p-1" aria-label="相交配对选择"
                        selectedKeys={selected ? [pairName(selected)] : []}
                        onSelectionChange={keys => setSelected(results.find(result => keys.has(pairName(result))) ?? null)}>
                        {results.map(result => <ToggleButton key={pairName(result)} id={pairName(result)} className="pair-item w-full justify-start"
                          data-highlighted={highlights ? highlights.pairs.includes(pairName(result)) : result === selected}
                          onHoverStart={() => setHover({ kind: 'pair', pair: pairName(result) })} onHoverEnd={() => setHover(null)}>
                          <span className="coordinates">{pairName(result)}</span> · {result.geometry.type === 'point' ? '点' : '重叠区间'}
                        </ToggleButton>)}
                      </ToggleButtonGroup>
                    </ScrollShadow>}
                </>}
            <Separator />
            <section ref={detailsRef} aria-label="精确详情" className="result-details flex min-w-0 flex-col gap-3" tabIndex={detailsScrollable ? 0 : -1}>
              <Card.Title render={props => <h2 {...props} />}>精确详情</Card.Title>
              {selected ? <><h3 className="coordinates">{pairName(selected)}</h3><p className="coordinates">{formatGeometry(selected.geometry)}</p>
                {selected.segments.map(i => <p key={i} className="coordinates">S{i}：{formatPoint(preset.segments[i].start)} → {formatPoint(preset.segments[i].end)}</p>)}
              </> : <p className="py-6 text-center text-sm text-muted">选择一个配对，检查交集和两个输入。</p>}
            </section>
          </Card.Content>
        </Card>
      </aside>
    <section className="workspace-panel input-panel" aria-label="原始输入"><Card>
      <Card.Header className="flex flex-row flex-wrap items-start justify-between gap-2"><div><Card.Title render={props => <h2 {...props} />} className="flex items-center gap-2">原始输入 <Chip>{preset.segments.length}</Chip></Card.Title><Card.Description>独立编号与精确端点</Card.Description></div><HelpButton topic="inputs">输入说明</HelpButton></Card.Header>
      <Card.Content>{preset.segments.length === 0
        ? <p className="py-6 text-center text-muted">输入集合为空</p>
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
  return <section aria-label="案例列表" className="case-list grid gap-4">
    <PageTitle page="案例列表" />
    {presets.map(preset => <article key={preset.id} aria-labelledby={`case-${preset.id}`}>
      <Card className="case-card h-full items-stretch">
        <Link className="case-thumbnail-link" to={`/cases/${preset.id}`} aria-label={`查看${preset.name}详情`}>
          <CaseThumbnail name={preset.name} segments={preset.segments} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Card.Header className="gap-1">
            <Card.Title render={props => <h2 {...props} />} id={`case-${preset.id}`}>{preset.name}</Card.Title>
            <Card.Description>{preset.description}</Card.Description>
          </Card.Header>
          <Card.Footer className="mt-auto flex flex-wrap justify-end gap-3">
            {preset.learning && <Link className={buttonVariants()} to={`/cases/${preset.id}/learn`}>开始学习</Link>}
            <Link className={buttonVariants({ variant: 'secondary' })} to={`/cases/${preset.id}`}>查看详情</Link>
          </Card.Footer>
        </div>
      </Card>
    </article>)}
  </section>
}

function LearningPage({ preset, trace, results }: { preset: Preset; trace: SweepTrace; results: Intersection[] }) {
  const [search, setSearch] = useSearchParams()
  const [preview, setPreview] = useState<{ search: URLSearchParams; index: number } | null>(null)
  const values = search.getAll('step')
  const value = values[0]
  if (values.length > 1 || (value !== undefined && !/^[0-9]+$/.test(value))) {
    return <RouteError message="教学步骤参数无效：请使用非负整数，且只提供一个 step 参数。" preset={preset} showListLink={false} />
  }
  const index = value === undefined ? 0 : Number(value)
  if (!Number.isSafeInteger(index) || index >= trace.steps.length) {
    return <RouteError message={`教学步骤超出范围：此案例的有效步骤为 0–${trace.steps.length - 1}。`} preset={preset} showListLink={false} />
  }
  return <><PageTitle page="逐步学习" preset={preset} /><LearningView preset={preset} trace={trace} results={results}
    index={preview?.search === search ? preview.index : index}
    onStepPreview={next => setPreview({ search, index: next })} onStepChange={next => {
    setPreview(null)
    if (next === index) return
    const updated = new URLSearchParams(search)
    updated.set('step', String(next))
    setSearch(updated, { replace: true })
  }} /></>
}

function RouteError({ message, preset, showListLink = true }: { message: string; preset?: Preset; showListLink?: boolean }) {
  return <section className="flex flex-col gap-4">
    <PageTitle page={preset ? `链接无效 · ${preset.name}` : '链接无效'} />
    <Alert status="danger" role="alert"><Alert.Content><Alert.Title>链接无效</Alert.Title><Alert.Description>{message}</Alert.Description></Alert.Content></Alert>
    <nav aria-label="恢复导航" className="flex flex-wrap gap-3">
      {showListLink && <Link className={buttonVariants({ variant: 'outline' })} to="/">返回列表</Link>}
      {preset && <Link className={buttonVariants({ variant: 'outline' })} to={`/cases/${preset.id}`}>查看详情</Link>}
      {preset?.learning && <Link className={buttonVariants()} to={`/cases/${preset.id}/learn`}>从头学习</Link>}
    </nav>
  </section>
}

function CasePage({ learning = false, unknownPath = false }: { learning?: boolean; unknownPath?: boolean }) {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const preset = presets.find(item => item.id === caseId)
  usePageShortcut(event => {
    if (learning || unknownPath || !preset?.learning || event.key !== 'ArrowRight') return
    event.preventDefault()
    if (!event.repeat) navigate(`/cases/${preset.id}/learn`)
  })
  if (!preset) return <RouteError message={`未知案例：${caseId}`} />
  if (unknownPath) return <RouteError message="未知页面路径。" preset={preset} />
  if (learning && !preset.learning) return <RouteError message="此案例不支持教学。" preset={preset} />
  return <CaseHelp key={`${preset.id}:${learning}`} preset={preset}>
    <div className="case-toolbar">
      <nav aria-label="页面导航"><Link className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to="/">返回列表</Link></nav>
      <h2 className="text-xl font-semibold">{preset.name}</h2>
      <div className="case-actions flex flex-wrap items-center gap-2">
        <HelpButton /><HelpButton topic="case">案例说明</HelpButton>
        {learning
          ? <Link className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={`/cases/${preset.id}`}>返回结果查看器</Link>
          : preset.learning && <Link className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2' })} to={`/cases/${preset.id}/learn`} aria-keyshortcuts="ArrowRight">开始逐步学习<Chip color="accent" variant="soft" size="sm" className="bg-white/20 text-white" aria-hidden="true">→</Chip></Link>}
      </div>
    </div>
    <CaseViewer preset={preset} learning={learning} />
  </CaseHelp>
}

export default function App() {
  const caseRoute = useMatch('/cases/:caseId/*')
  return <main className={caseRoute ? 'case-shell' : undefined}>
    {!caseRoute && <p className="mb-6 text-muted">选择案例，检查精确交点与完整重叠区间。</p>}
    <Routes>
      <Route path="/" element={<CaseList />} />
      <Route path="/cases/:caseId" element={<CasePage />} />
      <Route path="/cases/:caseId/learn" element={<CasePage learning />} />
      <Route path="/cases/:caseId/*" element={<CasePage unknownPath />} />
      <Route path="*" element={<RouteError message="未知页面路径。" />} />
    </Routes>
  </main>
}
