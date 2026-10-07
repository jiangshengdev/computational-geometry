import { useEffect, useState } from 'react'
import { GeometryView } from './GeometryView'
import { formatGeometry, formatPoint, pairName, type Intersection, type Preset } from './geometry'
import { presets } from './presets'
import './App.css'

type Computation = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; results: Intersection[] }

function CaseViewer({ preset }: { preset: Preset }) {
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  const [selected, setSelected] = useState<Intersection | null>(null)
  useEffect(() => {
    let current = true
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch('/api/intersections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: preset.segments }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json() as { intersections: Intersection[] }
        if (!Array.isArray(data.intersections)) throw new Error('结果结构无效')
        if (current) setComputation({ status: 'ready', results: data.intersections })
      } catch (error) {
        if (current) setComputation({ status: 'error', message: error instanceof Error ? error.message : '未知错误' })
      }
    }
    void compute()
    return () => { current = false; controller.abort() }
  }, [preset])
  const results = computation.status === 'ready' ? computation.results : []
  return <>
    <p className="case-description">{preset.description}</p>
    <div className="workspace">
      <GeometryView segments={preset.segments} results={results} selected={selected} />
      <aside className="results" aria-label="计算结果">
        <h2>相交配对</h2>
        {computation.status === 'loading' ? <p role="status">正在计算…</p> : computation.status === 'error'
          ? <p role="alert">计算失败，请检查本地服务。{computation.message}</p>
          : <><p role="status">{results.length} 个相交配对</p>
            {results.length === 0 ? <p>没有相交配对</p> : <ul className="pair-list">{results.map(result =>
              <li key={pairName(result)}><button aria-pressed={selected === result} onClick={() => setSelected(result)}>
                {pairName(result)} · {result.geometry.type === 'point' ? '点' : '重叠区间'}
              </button></li>)}</ul>}
          </>}
        <section aria-label="精确详情" className="details"><h2>精确详情</h2>
          {selected ? <><h3>{pairName(selected)}</h3><p className="coordinates">{formatGeometry(selected.geometry)}</p>
            {selected.segments.map(i => <p key={i} className="coordinates">S{i}：{formatPoint(preset.segments[i].start)} → {formatPoint(preset.segments[i].end)}</p>)}
          </> : <p>选择一个配对，检查交集和两个输入。</p>}
        </section>
      </aside>
    </div>
    <section className="inputs" aria-label="原始输入"><h2>原始输入 <span>{preset.segments.length}</span></h2>
      {preset.segments.length === 0 ? <p>输入集合为空</p> : <ul>{preset.segments.map((s, i) =>
        <li key={i}><strong>S{i}</strong><span className="coordinates">{formatPoint(s.start)} → {formatPoint(s.end)}</span></li>)}</ul>}
    </section>
  </>
}

export default function App() {
  const [preset, setPreset] = useState(presets[0])
  return <main>
    <header><div><h1>BO 结果查看器</h1><p>选择案例，检查精确交点与完整重叠区间。</p></div>
      <label>预设案例<select value={preset.id} onChange={event => setPreset(presets.find(p => p.id === event.target.value)!)}>
        {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
    </header>
    <CaseViewer key={preset.id} preset={preset} />
    <footer>每个输入保留独立身份。配对数不是独立几何交点数；图形仅作人工辅助校验。</footer>
  </main>
}
