import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import { ArrowRight, Info, SquareMinus, SquarePlus } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Tooltip } from '@heroui/react/tooltip'
import { Disclosure } from '@heroui/react/disclosure'
import type { ThemedToken } from 'shiki'
import { formatRational, type ExecutionVariable, type Rational, type SweepStep } from './geometry'
import { teachingModules } from './executionCode'
import { ExecutionSymbol, ExecutionVariableSymbol } from './ExecutionSymbol'
import { RustCode as VariableCode } from './RustCode'
import { tokenizeRust } from './rustHighlight'
import { callExpression, hasVariableValue, shadowedValueNote, symbolKind, variableChange, variableValue } from './executionSymbols'
import { formatExecutionValue } from './executionValue'

const highlightedModules = new Map<string, Promise<ThemedToken[][]>>()

function loadCode(code: string) {
  let highlighted = highlightedModules.get(code)
  highlighted ??= tokenizeRust(code)
  highlightedModules.set(code, highlighted)
  return highlighted
}

export function ExecutionPanel({ step, previous, values }: {
  step: SweepStep; previous: SweepStep; values: string[]
}) {
  const [highlight, setHighlight] = useState<{ source: string; tokens: ThemedToken[][] } | null>(null)
  const [error, setError] = useState(false)
  const take = step.execution.module === 'take'
  const module = teachingModules[step.execution.module]
  const source = module?.code
  const tokens = highlight?.source === source ? highlight?.tokens : null
  const boundaryLine = module && step.execution.boundary !== null ? module.boundaryLines[step.execution.boundary] : 0
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
  }, [tokens, boundaryLine])
  const context = step.execution.context
  return <section aria-label="核心代码回放" className="learning-panel learning-code"><Card className="learning-panel-card">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle render={props => <h2 {...props} />}>核心代码回放</CardTitle>
    </CardHeader>
    <CardContent className="learning-panel-content execution-content">
      {module ? <div className="execution-source">
        <div className="execution-summary">
        <p className="text-sm">教学代码 · Rust 风格精简片段 · <code>{context.function}</code> / {module.title}</p>
        <p className="text-sm" aria-live="polite">{step.execution.boundary === 0 ? '第一条核心语句之前 · 中间状态' : take ? step.execution.boundary === 1 ? '已取出队首；尚未匹配并绑定当前事件 · 中间状态' : step.action === 'take-empty' ? '队列为空，退出循环' : step.execution.boundary === 2 ? '已绑定 point 与 event；取事件模块完成' : '按实际控制流回放 · 中间状态' : context.locals.some(variable => variable.name === 'return_value' && variable.availability === 'available') ? '当前函数已返回' : '按实际控制流回放 · 中间状态'}</p>
        </div>
        <div ref={scroll} className="execution-code-scroll" tabIndex={0} role="region" aria-label={`${module.title}教学代码`}>
          {error ? <p role="alert">教学代码高亮加载失败，请刷新重试。</p> : tokens ? <pre className="execution-code"><code>
            {(() => {
              const occurrences = new Map<string, number>()
              return tokens.map((line, index) => {
              const text = line.map(token => token.content).join('')
              let offset = 0
              return <span className="code-line" key={index}>{line.map((token, tokenIndex) => {
                const tokenStart = offset
                offset += token.content.length
                let partOffset = 0
                return <span key={tokenIndex} style={{ color: token.color, ...token.htmlStyle } as CSSProperties}>{token.content.split(/([A-Za-z_][A-Za-z_0-9]*)/).map((part, partIndex) => {
                  const start = tokenStart + partOffset
                  partOffset += part.length
                  const kind = text.slice(0, start).includes('//') ? null : symbolKind(part, text.slice(0, start), text.slice(start + part.length))
                  const key = `${module.traceLines[index]}:${part}`
                  const occurrence = occurrences.get(key) ?? 0
                  if (kind === 'function' || kind === 'control') occurrences.set(key, occurrence + 1)
                  return kind ? <ExecutionSymbol key={partIndex} name={part} kind={kind} line={module.traceLines[index]} displayLine={index + 1} occurrence={occurrence} module={step.execution.module} expression={callExpression(part, text.slice(start + part.length))} step={step} previous={previous} values={values}>{part}</ExecutionSymbol> : part
                })}</span>
              })}{'\n'}</span>
              })
            })()}
          </code><span className="execution-boundary" role="img" aria-label={`执行边界：${take ? step.execution.boundary === 0 ? '取事件之前' : step.execution.boundary === 1 ? '匹配之前' : step.execution.boundary === 3 ? 'break 之前' : step.execution.boundary === 4 ? 'break 之后' : '模块结束' : `${module.title} ${step.execution.boundary}`}`} style={{ top: `calc(.75rem + ${boundaryLine} * 1.75rem)` }}><ArrowRight aria-hidden="true" /></span></pre> : <p role="status">加载教学代码…</p>}
        </div>
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
  const expansion = (key: string, defaultExpanded: boolean) => ({
    isExpanded: expanded[`${context.function}:${key}`] ?? defaultExpanded,
    onExpandedChange: (value: boolean) => setExpanded(current => ({ ...current, [`${context.function}:${key}`]: value })),
  })
  const renderVariable = (variable: ExecutionVariable, kind: 'parameters' | 'locals') => {
    const { changed } = variableChange(variable, kind, step, previous)
    const hasValue = hasVariableValue(variable)
    const shadowed = variable.availability === 'shadowed' && hasValue
    const value = variableValue(shadowed ? { ...variable, availability: 'available' } : variable, values)
    const multiline = hasValue && value.includes('\n')
    const suffix = `: ${variable.type} = `
    const state = expansion(`${kind}:${variable.name}`, false)
    if (multiline) return <Disclosure key={variable.name} {...state} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} step={step} previous={previous} values={values} disclosure indicator={<ExecutionDisclosureIndicator expanded={state.isExpanded} />}>
        <VariableCode>{suffix}</VariableCode>{!state.isExpanded && <VariableCode>{formatExecutionValue(value, 'summary')}</VariableCode>}
      </ExecutionVariableSymbol>{shadowed && !state.isExpanded && <span className="text-muted">{shadowedValueNote}</span>}</dt>
      <dd><Disclosure.Content><Disclosure.Body className="execution-variable-value"><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{shadowedValueNote}</span>}</Disclosure.Body></Disclosure.Content></dd>
    </Disclosure>
    return <div key={variable.name} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} step={step} previous={previous} values={values}><VariableCode>{variable.name}</VariableCode></ExecutionVariableSymbol><VariableCode>{suffix}</VariableCode></dt>
      <dd className={hasValue ? undefined : 'text-muted'}>{hasValue ? <><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{shadowedValueNote}</span>}</> : value}</dd>
    </div>
  }
  return <section aria-label="核心变量" className="learning-panel learning-variables"><Card className="learning-panel-card">
    <CardHeader><CardTitle render={props => <h2 {...props} />}>核心变量</CardTitle></CardHeader>
    <CardContent className="learning-panel-content execution-context">
      <section aria-label="当前执行上下文">
        <div className="flex items-center gap-1">
        <h3>当前函数：<VariableCode>{context.function}</VariableCode></h3>
        <Tooltip>
          <Button isIconOnly variant="ghost" size="sm" aria-label="核心变量说明"><Info size={16} aria-hidden="true" /></Button>
          <Tooltip.Content placement="bottom" className="execution-context-tooltip">
        <p className="execution-context-description text-sm text-muted">当前小步的核心上下文。<VariableCode>queue</VariableCode>、<VariableCode>next</VariableCode>、<VariableCode>point</VariableCode>、<VariableCode>current</VariableCode> 与扫描线段使用扫描坐标 <VariableCode>{`x′ = x + ${formatRational(shear)} · y`}</VariableCode>；<VariableCode>result</VariableCode> 与画布使用原坐标。同点分组为事件教学摘要，不代表局部变量。{context.function === 'sweep' && <>参数 <VariableCode>segments</VariableCode> 已被同名局部变量遮蔽。</>}</p>
          </Tooltip.Content>
        </Tooltip>
        </div>
        {(['parameters', 'locals'] as const).map(kind => <Disclosure key={kind} {...expansion(kind, true)}>
          <Disclosure.Heading level={4}><Disclosure.Trigger className="flex w-full items-center gap-2 text-left"><ExecutionDisclosureIndicator expanded={expansion(kind, true).isExpanded} />{kind === 'parameters' ? '核心参数' : '核心局部变量'}</Disclosure.Trigger></Disclosure.Heading>
          <Disclosure.Content><Disclosure.Body><dl>{context[kind].map(variable => renderVariable(variable, kind))}</dl></Disclosure.Body></Disclosure.Content>
        </Disclosure>)}
      </section>
    </CardContent>
  </Card></section>
}
