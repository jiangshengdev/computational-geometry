import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import { ArrowRight, Info, SquareMinus, SquarePlus } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Tooltip } from '@heroui/react/tooltip'
import { Disclosure } from '@heroui/react/disclosure'
import { Switch } from '@heroui/react/switch'
import { Label } from '@heroui/react/label'
import type { ThemedToken } from 'shiki'
import { formatRational, type ExecutionContext, type ExecutionVariable, type ExecutionVariableKind, type Rational, type SweepStep } from './geometry'
import { executionSource } from './executionCode'
import { ExecutionSymbol, ExecutionVariableSymbol } from './ExecutionSymbol'
import { RustCode as VariableCode } from './RustCode'
import { tokenizeRust } from './rustHighlight'
import { callExpression, hasVariableValue, shadowedValueNote, variableChange, variableValue } from './executionSymbols'
import { codeSymbols } from './executionAccess'
import { formatExecutionValue } from './executionValue'
import { useLayoutPreference } from './useLayoutPreference'

const highlightedModules = new Map<string, Promise<ThemedToken[][]>>()

function loadCode(code: string) {
  let highlighted = highlightedModules.get(code)
  highlighted ??= tokenizeRust(code)
  highlightedModules.set(code, highlighted)
  return highlighted
}

export function ExecutionPanel({ steps, index: stepIndex, values }: {
  steps: readonly SweepStep[]; index: number; values: string[]
}) {
  const step = steps[stepIndex]
  const previous = steps[Math.max(0, stepIndex - 1)]
  const [highlight, setHighlight] = useState<{ source: string; tokens: ThemedToken[][] } | null>(null)
  const [error, setError] = useState(false)
  const [wrap, setWrap] = useLayoutPreference('bo-learning-layout-v1-code-wrap', true,
    (value): value is boolean => typeof value === 'boolean')
  const take = step.execution.module === 'take'
  const { module, caller, closure, boundaryLine } = executionSource(steps, stepIndex)
  const source = module?.code
  const tokens = highlight?.source === source ? highlight?.tokens : null
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let active = true
    if (source) void loadCode(source).then(result => { if (active) { setHighlight({ source, tokens: result }); setError(false) } }, () => { if (active) setError(true) })
    return () => { active = false }
  }, [source])
  useLayoutEffect(() => {
    const container = scroll.current
    const boundary = container?.querySelector<HTMLElement>('.execution-boundary')
    if (!container || !boundary) return
    const code = boundary.parentElement!
    const lines = code.querySelectorAll<HTMLElement>('.code-line')
    const position = () => {
      const line = lines[boundaryLine]
      const last = lines[lines.length - 1]
      if (!last) return
      const top = line ? line.offsetTop : last.offsetTop + last.offsetHeight
      boundary.style.top = `${top}px`
      if (top < container.scrollTop || top + 12 > container.scrollTop + container.clientHeight) {
        container.scrollTop = Math.max(0, top - container.clientHeight / 2)
      }
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(code)
    observer.observe(container)
    return () => observer.disconnect()
  }, [tokens, boundaryLine, wrap])
  const context = step.execution.context
  return <section aria-label="核心代码回放" className="learning-panel learning-code"><Card className="learning-panel-card">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle render={props => <h2 {...props} />}>核心代码回放</CardTitle>
      <Switch size="sm" isSelected={wrap} onChange={setWrap}>
        <Switch.Content>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Label>自动换行</Label>
        </Switch.Content>
      </Switch>
    </CardHeader>
    <CardContent className="learning-panel-content execution-content">
      {module ? <div className="execution-source">
        <p className="text-sm"><code>{context.function}</code> / {module.title}</p>
        <div ref={scroll} className="execution-code-scroll" tabIndex={0} role="region" aria-label={`${module.title}教学代码`}>
          {error ? <p role="alert">教学代码高亮加载失败，请刷新重试。</p> : tokens ? <pre className="execution-code" data-wrap={wrap}><code>
            {(() => {
              const occurrences = new Map<string, number>()
              let sourceOffset = 0
              return tokens.map((line, index) => {
              const text = line.map(token => token.content).join('')
              const continuationIndent = text.match(/^ */)![0].length + 2
              const lineOffset = sourceOffset
              sourceOffset += text.length + 1
              const symbols = codeSymbols(text)
              const cuts = [...new Set([0, text.length, ...symbols.flatMap(symbol => [symbol.start, symbol.end])])].sort((a, b) => a - b)
              return <span className="code-line" key={index} style={{ '--continuation-indent': `${continuationIndent}ch` } as CSSProperties}>{cuts.slice(0, -1).map((start, partIndex) => {
                  const end = cuts[partIndex + 1]
                  const symbol = symbols.find(symbol => symbol.start === start)
                  const part = text.slice(start, end)
                  const kind = symbol?.kind
                  let tokenOffset = 0
                  const highlighted = tokens[index].map((token, tokenIndex) => {
                    const from = Math.max(start, tokenOffset), to = Math.min(end, tokenOffset + token.content.length)
                    tokenOffset += token.content.length
                    return from < to ? <span key={tokenIndex} style={{ color: token.color, ...token.htmlStyle } as CSSProperties}>{text.slice(from, to)}</span> : null
                  })
                  const inClosure = closure && index >= closure.start && index <= closure.end && (index !== closure.start || start >= closure.parameterColumn)
                  const symbolStep = inClosure ? step : caller
                  const line = inClosure ? closure.lines.indexOf(index) + 1 : module.traceLines[index]
                  const key = `${symbolStep.execution.module}:${line}:${part}`
                  const occurrence = occurrences.get(key) ?? 0
                  if (kind === 'function' || kind === 'control') occurrences.set(key, occurrence + 1)
                  return kind ? <ExecutionSymbol key={`${module.title}:${index}:${start}:${symbol!.name}`} name={symbol!.name} kind={kind} access={symbol?.access} line={line} displayLine={index + 1} occurrence={occurrence} module={symbolStep.execution.module} expression={callExpression(part, module.code.slice(lineOffset + start + part.length))} step={symbolStep} previous={previous} values={values}>{highlighted}</ExecutionSymbol> : <span key={partIndex}>{highlighted}</span>
              })}{'\n'}</span>
              })
            })()}
          </code><span className="execution-boundary" role="img" aria-label={`执行边界：${take ? step.execution.boundary === 0 ? '取事件之前' : step.execution.boundary === 1 ? '匹配之前' : step.execution.boundary === 3 ? 'break 之前' : step.execution.boundary === 4 ? 'break 之后' : '模块结束' : `${module.title} ${step.execution.boundary}`}`}><ArrowRight aria-hidden="true" /></span></pre> : <p role="status">加载教学代码…</p>}
        </div>
        <p className="execution-status text-sm text-muted" aria-live="polite">{step.execution.returning ? '返回值已产生 · 尚未恢复调用方' : step.execution.boundary === 0 ? '第一条核心语句之前 · 中间状态' : take ? step.execution.boundary === 1 ? '已取出队首；尚未匹配并绑定当前事件 · 中间状态' : step.action === 'take-empty' ? '队列为空，退出循环' : step.execution.boundary === 2 ? '已绑定 point 与 event；取事件模块完成' : '按实际控制流回放 · 中间状态' : context.locals.some(variable => variable.name === 'return_value' && variable.availability === 'available') ? '当前函数已返回' : '按实际控制流回放 · 中间状态'}{step.execution.blocks.map(block => {
          const keyword = step.execution.controls.find(control => control.line === block.line && ['if', 'else', 'for'].includes(control.keyword))?.keyword
          return <span key={`${block.line}:${block.phase}`}> · {keyword} 块结束{block.phase === 'before' ? '前' : '后'}</span>
        })}</p>
      </div> : <p className="text-sm">当前模块仅提供大步观察点，尚未细化为核心代码小步。</p>}
    </CardContent>
  </Card></section>
}

function ExecutionDisclosureIndicator({ expanded }: { expanded: boolean }) {
  return <span className="flex h-lh shrink-0 items-center"><Disclosure.Indicator className="ms-0 transition-none data-[expanded=true]:rotate-0">
    {expanded ? <SquareMinus aria-hidden="true" /> : <SquarePlus aria-hidden="true" />}
  </Disclosure.Indicator></span>
}

export function ExecutionVariablesPanel({ step, previous, shear, values }: {
  step: SweepStep; previous: SweepStep; shear: Rational; values: string[]
}) {
  const context = step.execution.context
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const expansion = (frame: ExecutionContext, key: string, defaultExpanded: boolean) => ({
    isExpanded: expanded[`${frame.id}:${key}`] ?? defaultExpanded,
    onExpandedChange: (value: boolean) => setExpanded(current => ({ ...current, [`${frame.id}:${key}`]: value })),
  })
  const renderVariable = (variable: ExecutionVariable, kind: ExecutionVariableKind, frame: ExecutionContext) => {
    const { changed } = variableChange(variable, kind, step, previous, undefined, frame)
    const hasValue = hasVariableValue(variable)
    const shadowed = variable.availability === 'shadowed' && hasValue
    const value = variableValue(shadowed ? { ...variable, availability: 'available' } : variable, values)
    const multiline = hasValue && value.includes('\n')
    const suffix = `: ${variable.type} = `
    const state = expansion(frame, `${kind}:${variable.scope}:${variable.name}`, false)
    if (multiline) return <Disclosure key={variable.name} {...state} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} context={frame} step={step} previous={previous} values={values} disclosure indicator={<ExecutionDisclosureIndicator expanded={state.isExpanded} />}>
        <VariableCode>{suffix}</VariableCode>{!state.isExpanded && <VariableCode>{formatExecutionValue(value, 'summary')}</VariableCode>}
      </ExecutionVariableSymbol>{shadowed && !state.isExpanded && <span className="text-muted">{shadowedValueNote}</span>}</dt>
      <dd><Disclosure.Content><Disclosure.Body className="execution-variable-value"><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{shadowedValueNote}</span>}</Disclosure.Body></Disclosure.Content></dd>
    </Disclosure>
    return <div key={variable.name} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} context={frame} step={step} previous={previous} values={values}><VariableCode>{variable.name}</VariableCode></ExecutionVariableSymbol><VariableCode>{suffix}</VariableCode></dt>
      <dd className={hasValue ? undefined : 'text-muted'}>{hasValue ? <><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{shadowedValueNote}</span>}</> : value}</dd>
    </div>
  }
  return <section aria-label="核心变量" className="learning-panel learning-variables"><Card className="learning-panel-card">
    <CardHeader><CardTitle render={props => <h2 {...props} />}>核心变量</CardTitle></CardHeader>
    <CardContent className="learning-panel-content execution-context">
      {[context, ...step.execution.outer.toReversed()].map(frame => <section key={frame.id} aria-label={frame === context ? '当前执行上下文' : `外层执行上下文 ${frame.function}`} data-context-id={frame.id}>
        <div className="flex items-center gap-1">
        <h3>{frame === context ? '当前函数' : '外层函数'}：<VariableCode>{frame.function}</VariableCode></h3>
        <Tooltip>
          <Button isIconOnly variant="ghost" size="sm" aria-label="核心变量说明"><Info size={16} aria-hidden="true" /></Button>
          <Tooltip.Content placement="bottom" className="execution-context-tooltip">
        <p className="execution-context-description text-sm text-muted">当前小步的核心上下文。<VariableCode>queue</VariableCode>、<VariableCode>next</VariableCode>、<VariableCode>point</VariableCode>、<VariableCode>current</VariableCode> 与扫描线段使用扫描坐标 <VariableCode>{`x′ = x + ${formatRational(shear)} · y`}</VariableCode>；<VariableCode>result</VariableCode> 与画布使用原坐标。同点分组为事件教学摘要，不代表局部变量。{frame.function === 'sweep' && <>参数 <VariableCode>segments</VariableCode> 已被同名局部变量遮蔽。</>}</p>
          </Tooltip.Content>
        </Tooltip>
        </div>
        {(['parameters', 'captures', 'locals'] as const).filter(kind => kind !== 'captures' || frame.captures.length > 0).map(kind => <Disclosure key={kind} {...expansion(frame, kind, true)}>
          <Disclosure.Heading level={4}><Disclosure.Trigger className="flex w-full items-center gap-2 text-left"><ExecutionDisclosureIndicator expanded={expansion(frame, kind, true).isExpanded} />{kind === 'parameters' ? '核心参数' : kind === 'captures' ? '捕获变量' : '核心局部变量'}</Disclosure.Trigger></Disclosure.Heading>
          <Disclosure.Content><Disclosure.Body><dl>{frame[kind].map(variable => renderVariable(variable, kind, frame))}</dl></Disclosure.Body></Disclosure.Content>
        </Disclosure>)}
      </section>)}
    </CardContent>
  </Card></section>
}
