import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import type { ThemedToken } from 'shiki'
import { formatRational, type ExecutionVariable, type Rational, type SweepStep } from './geometry'
import { teachingModules } from './executionCode'
import { ExecutionSymbol } from './ExecutionSymbol'
import { callExpression, symbolKind, variableChange, variableValue } from './executionSymbols'

const highlightedModules = new Map<string, Promise<ThemedToken[][]>>()
function loadCode(code: string) {
  let highlighted = highlightedModules.get(code)
  highlighted ??= import('shiki').then(({ codeToTokens }) => codeToTokens(code, {
    lang: 'rust', themes: { light: 'github-light', dark: 'github-dark' },
  })).then(result => result.tokens)
  highlightedModules.set(code, highlighted)
  return highlighted
}

export function ExecutionPanel({ step, previous, shear, values }: {
  step: SweepStep; previous: SweepStep; shear: Rational; values: string[]
}) {
  const [highlight, setHighlight] = useState<{ source: string; tokens: ThemedToken[][] } | null>(null)
  const [error, setError] = useState(false)
  const take = step.execution.module === 'take'
  const module = teachingModules[step.execution.module]
  const source = module?.code
  const tokens = highlight?.source === source ? highlight?.tokens : null
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let active = true
    if (source) void loadCode(source).then(result => { if (active) { setHighlight({ source, tokens: result }); setError(false) } }, () => { if (active) setError(true) })
    return () => { active = false }
  }, [source])
  useEffect(() => {
    const container = scroll.current
    const boundary = container?.querySelector<HTMLElement>('.execution-boundary')
    if (!container || !boundary) return
    const top = boundary.offsetTop
    if (top < container.scrollTop || top + 12 > container.scrollTop + container.clientHeight) {
      container.scrollTop = Math.max(0, top - container.clientHeight / 2)
    }
  }, [tokens, step.execution.boundary])
  const context = step.execution.context
  const renderVariable = (variable: ExecutionVariable, kind: 'parameters' | 'locals') => {
    const { changed } = variableChange(variable, kind, step, previous)
    return <div key={variable.name} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><code>{variable.name}</code> <span className="text-muted">{variable.type}</span>{changed && <span className="execution-change">本步变化</span>}</dt>
      <dd>{variableValue(variable, values)}</dd>
    </div>
  }
  return <section aria-label="核心代码回放" className="learning-panel learning-code"><Card className="learning-panel-card">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle render={props => <h2 {...props} />}>核心代码回放</CardTitle>
    </CardHeader>
    <CardContent className="learning-panel-content execution-content">
      {module ? <div className="execution-source">
        <p className="text-sm">教学代码 · Rust 风格精简片段 · <code>{context.function}</code> / {module.title}</p>
        <p className="text-sm" aria-live="polite">{step.execution.boundary === 0 ? '第一条核心语句之前 · 中间状态' : take ? step.execution.boundary === 1 ? '已取出队首；尚未匹配并绑定当前事件 · 中间状态' : step.action === 'take-empty' ? '队列为空，退出循环' : '已绑定 point 与 event；取事件模块完成' : context.locals.some(variable => variable.name === 'return_value' && variable.availability === 'available') ? '当前函数已返回' : '按实际控制流回放 · 中间状态'}</p>
        <div ref={scroll} className="execution-code-scroll" tabIndex={0} role="region" aria-label={`${module.title}教学代码`}>
          {error ? <p role="alert">教学代码高亮加载失败，请刷新重试。</p> : tokens ? <pre className="execution-code"><code>
            {tokens.map((line, index) => {
              const text = line.map(token => token.content).join('')
              let offset = 0
              const occurrences = new Map<string, number>()
              return <span className="code-line" key={index}>{line.map((token, tokenIndex) => {
                const tokenStart = offset
                offset += token.content.length
                let partOffset = 0
                return <span key={tokenIndex} style={{ color: token.color, ...token.htmlStyle } as CSSProperties}>{token.content.split(/([A-Za-z_][A-Za-z_0-9]*)/).map((part, partIndex) => {
                  const start = tokenStart + partOffset
                  partOffset += part.length
                  const kind = text.slice(0, start).includes('//') ? null : symbolKind(part, text.slice(0, start), text.slice(start + part.length))
                  const occurrence = occurrences.get(part) ?? 0
                  if (kind === 'function') occurrences.set(part, occurrence + 1)
                  return kind ? <ExecutionSymbol key={partIndex} name={part} kind={kind} line={index + 1} occurrence={occurrence} module={step.execution.module} expression={callExpression(part, text.slice(start + part.length))} step={step} previous={previous} values={values}>{part}</ExecutionSymbol> : part
                })}</span>
              })}{'\n'}</span>
            })}
          </code><span className="execution-boundary" role="img" aria-label={`执行边界：${take ? step.execution.boundary === 0 ? '取事件之前' : step.execution.boundary === 1 ? '匹配之前' : '模块结束' : `${module.title} ${step.execution.boundary}`}`} style={{ top: `calc(.75rem + ${step.execution.boundary} * 1.75rem)` }}>➜</span></pre> : <p role="status">加载教学代码…</p>}
        </div>
      </div> : <p className="text-sm">当前模块仅提供大步观察点，尚未细化为核心代码小步。</p>}
      <section aria-label="当前执行上下文" className="execution-context">
        <h3>当前函数：<code>{context.function}</code></h3>
        <p className="text-sm text-muted">当前小步的核心上下文。queue、next、point、current 与扫描线段使用扫描坐标 x′ = x + {formatRational(shear)} · y；result 与画布使用原坐标。同点分组为事件教学摘要，不代表局部变量。{context.function === 'sweep' && '参数 segments 已被同名局部变量遮蔽。'}</p>
        <h4>核心参数</h4><dl>{context.parameters.map(variable => renderVariable(variable, 'parameters'))}</dl>
        <h4>核心局部变量</h4><dl>{context.locals.map(variable => renderVariable(variable, 'locals'))}</dl>
      </section>
    </CardContent>
  </Card></section>
}
