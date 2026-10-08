import { useEffect, useState } from 'react'
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router'
import { GeometryView } from './GeometryView'
import { formatGeometry, formatPoint, pairName, type Intersection, type Preset, type SweepTrace } from './geometry'
import { LearningIntroduction, LearningView } from './LearningView'
import { presets } from './presets'
import { hoverHighlights, type HoverTarget } from './hover'
import './App.css'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Computation = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; results: Intersection[]; trace?: SweepTrace }

function CaseViewer({ preset, learning }: { preset: Preset; learning: boolean }) {
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  const [selected, setSelected] = useState<Intersection | null>(null)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const teachable = Boolean(preset.learning)
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
    <LearningIntroduction key="learning" />
    <p className="mb-4">{preset.name} · <span className="coordinates">{preset.description}</span> 从左向右扫描，按 <span className="coordinates">(x, y)</span> 排序，精确计算。</p>
    {computation.status === 'loading'
      ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />正在加载教学轨迹…</div>
      : computation.status === 'error'
        ? <Alert variant="destructive"><AlertTitle>计算失败</AlertTitle><AlertDescription>请检查本地服务。{computation.message}</AlertDescription></Alert>
        : computation.trace && <LearningPage preset={preset} trace={computation.trace} results={results} />}
    <Button asChild className="mt-6" variant="outline"><Link to={`/cases/${preset.id}`}>返回结果查看器</Link></Button>
  </>
  return <>
    <LearningIntroduction />
    <p className="my-6 text-muted-foreground"><span className="coordinates">{preset.description}</span></p>
    {preset.learning && <p className="mb-4">学习目标：{preset.learning.goal}</p>}
    {teachable ? <Button asChild className="mb-4"><Link to={`/cases/${preset.id}/learn`}>开始逐步学习</Link></Button>
      : <p className="mb-4 text-muted-foreground">此案例目前提供结果查看；逐步学习请选择普通交叉、无交点、相邻检测、同扫描坐标不同交点、共端点、起点落在内部或终点落在内部。</p>}
    <div className="workspace">
      <GeometryView segments={preset.segments} results={results} selected={selected} highlights={highlights} onHover={setHover} />
      <aside className="min-w-0" aria-label="计算结果">
        <Card>
          <CardHeader><CardTitle><h2>相交配对</h2></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {computation.status === 'loading'
              ? <div role="status" className="flex items-center gap-2"><Spinner aria-hidden="true" />正在计算…</div>
              : computation.status === 'error'
                ? <Alert variant="destructive"><AlertTitle>计算失败</AlertTitle><AlertDescription>请检查本地服务。{computation.message}</AlertDescription></Alert>
                : <><div role="status"><Badge variant="secondary">{results.length} 个相交配对</Badge></div>
                  {results.length === 0
                    ? <Empty><EmptyHeader><EmptyTitle>没有相交配对</EmptyTitle></EmptyHeader></Empty>
                    : <ScrollArea className="[&_[data-slot=scroll-area-viewport]]:max-h-60">
                      <ToggleGroup type="single" orientation="vertical" spacing={2} className="w-full flex-col p-1" aria-label="相交配对选择"
                        value={selected ? pairName(selected) : ''}
                        onValueChange={value => setSelected(results.find(result => pairName(result) === value) ?? null)}>
                        {results.map(result => <ToggleGroupItem key={pairName(result)} value={pairName(result)} className="pair-item w-full justify-start"
                          data-highlighted={highlights ? highlights.pairs.includes(pairName(result)) : result === selected}
                          onPointerEnter={() => setHover({ kind: 'pair', pair: pairName(result) })} onPointerLeave={() => setHover(null)}>
                          <span className="coordinates">{pairName(result)}</span> · {result.geometry.type === 'point' ? '点' : '重叠区间'}
                        </ToggleGroupItem>)}
                      </ToggleGroup>
                    </ScrollArea>}
                </>}
            <Separator />
            <section aria-label="精确详情" className="flex min-w-0 flex-col gap-3">
              <CardTitle><h2>精确详情</h2></CardTitle>
              {selected ? <><h3 className="coordinates">{pairName(selected)}</h3><p className="coordinates">{formatGeometry(selected.geometry)}</p>
                {selected.segments.map(i => <p key={i} className="coordinates">S{i}：{formatPoint(preset.segments[i].start)} → {formatPoint(preset.segments[i].end)}</p>)}
              </> : <Empty><EmptyHeader><EmptyDescription>选择一个配对，检查交集和两个输入。</EmptyDescription></EmptyHeader></Empty>}
            </section>
          </CardContent>
        </Card>
      </aside>
    </div>
    <section className="mt-7" aria-label="原始输入"><Card>
      <CardHeader><CardTitle><h2 className="flex items-center gap-2">原始输入 <Badge variant="secondary">{preset.segments.length}</Badge></h2></CardTitle></CardHeader>
      <CardContent>{preset.segments.length === 0
        ? <Empty><EmptyHeader><EmptyTitle>输入集合为空</EmptyTitle></EmptyHeader></Empty>
        : <ul className="flex flex-wrap gap-x-8 gap-y-3">{preset.segments.map((s, i) =>
          <li key={i} className="input-item flex min-w-0 flex-wrap gap-3 text-sm"
            data-highlighted={highlights ? highlights.inputs.includes(i) : selected?.segments.includes(i) ?? false}
            onPointerEnter={() => setHover({ kind: 'input', index: i })} onPointerLeave={() => setHover(null)}>
            <strong className="coordinates">S{i}</strong><span className="coordinates">{formatPoint(s.start)} → {formatPoint(s.end)}</span></li>)}</ul>}
      </CardContent>
    </Card>
    </section>
  </>
}

function CaseList() {
  return <section aria-label="案例列表" className="grid gap-4 sm:grid-cols-2">
    {presets.map(preset => <article key={preset.id} aria-labelledby={`case-${preset.id}`}>
      <Card className="h-full">
        <CardHeader><CardTitle><h2 id={`case-${preset.id}`}>{preset.name}</h2></CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">{preset.description}</p>
          {preset.learning && <Badge variant="secondary">支持教学</Badge>}
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link to={`/cases/${preset.id}`}>查看详情</Link></Button>
            {preset.learning && <Button asChild><Link to={`/cases/${preset.id}/learn`}>开始学习</Link></Button>}
          </div>
        </CardContent>
      </Card>
    </article>)}
  </section>
}

function LearningPage({ preset, trace, results }: { preset: Preset; trace: SweepTrace; results: Intersection[] }) {
  const [search, setSearch] = useSearchParams()
  const values = search.getAll('step')
  const value = values[0]
  if (values.length > 1 || (value !== undefined && !/^[0-9]+$/.test(value))) {
    return <RouteError message="教学步骤参数无效：请使用非负整数，且只提供一个 step 参数。" preset={preset} showListLink={false} />
  }
  const index = value === undefined ? 0 : Number(value)
  if (!Number.isSafeInteger(index) || index >= trace.steps.length) {
    return <RouteError message={`教学步骤超出范围：此案例的有效步骤为 0–${trace.steps.length - 1}。`} preset={preset} showListLink={false} />
  }
  return <LearningView preset={preset} trace={trace} results={results} index={index} onStepChange={next => {
    const updated = new URLSearchParams(search)
    updated.set('step', String(next))
    setSearch(updated, { replace: true })
  }} />
}

function RouteError({ message, preset, showListLink = true }: { message: string; preset?: Preset; showListLink?: boolean }) {
  return <section className="flex flex-col gap-4">
    <Alert variant="destructive"><AlertTitle>链接无效</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>
    <nav aria-label="恢复导航" className="flex flex-wrap gap-3">
      {showListLink && <Button asChild variant="outline"><Link to="/">返回列表</Link></Button>}
      {preset && <Button asChild variant="outline"><Link to={`/cases/${preset.id}`}>查看详情</Link></Button>}
      {preset?.learning && <Button asChild><Link to={`/cases/${preset.id}/learn`}>从头学习</Link></Button>}
    </nav>
  </section>
}

function CasePage({ learning = false, unknownPath = false }: { learning?: boolean; unknownPath?: boolean }) {
  const { caseId } = useParams()
  const preset = presets.find(item => item.id === caseId)
  if (!preset) return <RouteError message={`未知案例：${caseId}`} />
  if (unknownPath) return <RouteError message="未知页面路径。" preset={preset} />
  if (learning && !preset.learning) return <RouteError message="此案例不支持教学。" preset={preset} />
  return <>
    <nav aria-label="页面导航" className="mb-4"><Button asChild variant="outline"><Link to="/">返回列表</Link></Button></nav>
    <h2 className="mb-4 text-xl font-semibold">{preset.name}</h2>
    <CaseViewer key={`${preset.id}:${learning}`} preset={preset} learning={learning} />
  </>
}

export default function App() {
  return <main>
    <header className="viewer-header"><div><h1 className="text-3xl font-semibold tracking-tight">BO 结果查看器</h1><p className="mt-2 text-muted-foreground">选择案例，检查精确交点与完整重叠区间。</p></div></header>
    <Routes>
      <Route path="/" element={<CaseList />} />
      <Route path="/cases/:caseId" element={<CasePage />} />
      <Route path="/cases/:caseId/learn" element={<CasePage learning />} />
      <Route path="/cases/:caseId/*" element={<CasePage unknownPath />} />
      <Route path="*" element={<RouteError message="未知页面路径。" />} />
    </Routes>
    <Separator className="mt-6" />
    <footer className="pt-4 text-xs text-muted-foreground">每个输入保留独立身份。配对数不是独立几何交点数；图形仅作人工辅助校验。</footer>
  </main>
}
