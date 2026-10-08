import { useEffect, useState } from 'react'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Computation = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; results: Intersection[]; trace?: SweepTrace }

function CaseViewer({ preset }: { preset: Preset }) {
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  const [selected, setSelected] = useState<Intersection | null>(null)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [learning, setLearning] = useState(false)
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
        if (teachable && (!data.trace?.steps.length || data.trace.shear.numerator !== '0')) throw new Error('教学轨迹无效')
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
  if (learning && computation.status === 'ready' && computation.trace) return <>
    <LearningIntroduction key="learning" />
    <p className="mb-4">{preset.name} · <span className="coordinates">{preset.description}</span> 从左向右扫描，按 <span className="coordinates">(x, y)</span> 排序，精确计算。</p>
    <LearningView preset={preset} trace={computation.trace} results={results} />
    <Button className="mt-6" variant="outline" onClick={() => setLearning(false)}>返回结果查看器</Button>
  </>
  return <>
    <LearningIntroduction />
    <p className="my-6 text-muted-foreground"><span className="coordinates">{preset.description}</span></p>
    {preset.learning && <p className="mb-4">学习目标：{preset.learning.goal}</p>}
    {teachable ? <Button className="mb-4" disabled={computation.status !== 'ready'} onClick={() => setLearning(true)}>开始逐步学习</Button>
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

export default function App() {
  const [preset, setPreset] = useState(presets[0])
  return <main>
    <header className="viewer-header"><div><h1 className="text-3xl font-semibold tracking-tight">BO 结果查看器</h1><p className="mt-2 text-muted-foreground">选择案例，检查精确交点与完整重叠区间。</p></div>
      <FieldGroup className="w-full min-[851px]:w-64"><Field>
        <FieldLabel htmlFor="preset">预设案例</FieldLabel>
        <Select value={preset.id} onValueChange={value => setPreset(presets.find(p => p.id === value)!)}>
          <SelectTrigger id="preset" className="w-full"><SelectValue>{preset.name}</SelectValue></SelectTrigger>
          <SelectContent position="popper"><SelectGroup>
            {presets.map(p => <SelectItem key={p.id} value={p.id} textValue={p.name} aria-labelledby={`preset-${p.id}-name`} aria-describedby={p.learning ? `preset-${p.id}-learning` : undefined}>
              <span id={`preset-${p.id}-name`}>{p.name}</span>
              {p.learning ? <Badge id={`preset-${p.id}-learning`} variant="secondary">学习</Badge> : null}
            </SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
      </Field></FieldGroup>
    </header>
    <CaseViewer key={preset.id} preset={preset} />
    <Separator className="mt-6" />
    <footer className="pt-4 text-xs text-muted-foreground">每个输入保留独立身份。配对数不是独立几何交点数；图形仅作人工辅助校验。</footer>
  </main>
}
