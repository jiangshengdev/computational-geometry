import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import { ArrowRight, Info, SquareMinus, SquarePlus } from 'lucide-react'
import { Button } from '@heroui/react/button'
import { Tooltip } from '@heroui/react/tooltip'
import { Disclosure } from '@heroui/react/disclosure'
import { Switch } from '@heroui/react/switch'
import { Label } from '@heroui/react/label'
import type { ThemedToken } from 'shiki'
import { formatRational, type Rational } from '../../../../geometry/geometry'
import { type ExecutionContext, type ExecutionVariable, type ExecutionVariableKind, type SweepStep } from './trace'
import { executionSource, translatedTeachingCode } from './executionCode'
import { ExecutionSymbol, ExecutionVariableSymbol } from './ExecutionSymbol'
import { RustCode as VariableCode } from './RustCode'
import { tokenizeRust } from './rustHighlight'
import { callExpression, hasVariableValue, shadowedValueNote, variableChange, variableValue } from './executionSymbols'
import { codeSymbols } from './executionAccess'
import { formatExecutionValue } from './executionValue'
import { useLayoutPreference } from '../../../../app/useLayoutPreference'

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
  const { _ } = useLingui()
  const step = steps[stepIndex]
  const previous = steps[Math.max(0, stepIndex - 1)]
  const [highlight, setHighlight] = useState<{ source: string; tokens: ThemedToken[][] } | null>(null)
  const [error, setError] = useState(false)
  const [wrap, setWrap] = useLayoutPreference('bo-learning-layout-v1-code-wrap', true,
    (value): value is boolean => typeof value === 'boolean')
  const take = step.execution.module === 'take'
  const { module, caller, closure, boundaryLine } = executionSource(steps, stepIndex)
  const source = module && translatedTeachingCode(module, _)
  const title = module && _(module.title)
  const tokens: ThemedToken[][] | null = source
    ? highlight?.source === source ? highlight.tokens : source.split('\n').map(content => [{ content, offset: 0 }])
    : null
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
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(code)
    observer.observe(container)
    return () => observer.disconnect()
  }, [tokens, boundaryLine, wrap])
  // Follow navigation, not highlighting or resize notifications: those must
  // not move a symbol away from the pointer while its preview is opening.
  useLayoutEffect(() => {
    const container = scroll.current
    const boundary = container?.querySelector<HTMLElement>('.execution-boundary')
    if (!container || !boundary) return
    const top = boundary.offsetTop
    if (top < container.scrollTop || top + 12 > container.scrollTop + container.clientHeight) {
      container.scrollTop = Math.max(0, top - container.clientHeight / 2)
    }
  }, [stepIndex, source, boundaryLine, wrap])
  const context = step.execution.context
  return <section aria-label={_(/*i18n*/ { id: "Core code replay", message: "Core code replay" })} className="learning-panel learning-code"><Card className="learning-panel-card">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle render={props => <h2 {...props} />}>{_(/*i18n*/ { id: "Core code replay", message: "Core code replay" })}</CardTitle>
      <Switch size="sm" isSelected={wrap} onChange={setWrap}>
        <Switch.Content>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Label>{_(/*i18n*/ { id: "Wrap lines", message: "Wrap lines" })}</Label>
        </Switch.Content>
      </Switch>
    </CardHeader>
    <CardContent className="learning-panel-content execution-content">
      {module ? <div className="execution-source">
        <p className="text-sm"><code>{context.function}</code> / {title}</p>
        <div ref={scroll} className="execution-code-scroll" tabIndex={0} role="region" aria-label={_(/*i18n*/ { id: "{title} teaching code", message: "{title} teaching code" , values: { title }})}>
          {error ? <p role="alert">{_(/*i18n*/ { id: "Teaching code highlighting failed to load. Refresh to try again.", message: "Teaching code highlighting failed to load. Refresh to try again." })}</p> : tokens ? <pre className="execution-code" data-wrap={wrap}><code>
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
                  return kind ? <ExecutionSymbol key={`${caller.execution.module}:${index}:${start}:${symbol!.name}`} name={symbol!.name} kind={kind} access={symbol?.access} line={line} displayLine={index + 1} occurrence={occurrence} module={symbolStep.execution.module} expression={callExpression(part, source!.slice(lineOffset + start + part.length))} step={symbolStep} previous={previous} values={values}>{highlighted}</ExecutionSymbol> : <span key={partIndex}>{highlighted}</span>
              })}{'\n'}</span>
              })
            })()}
          </code><span className="execution-boundary" role="img" aria-label={_(/*i18n*/ { id: "Execution boundary: {boundary}", message: "Execution boundary: {boundary}" , values: { boundary: take ? step.execution.boundary === 0 ? _(/*i18n*/ { id: "Before taking the event", message: "Before taking the event" }) : step.execution.boundary === 1 ? _(/*i18n*/ { id: "Before matching", message: "Before matching" }) : step.execution.boundary === 3 ? _(/*i18n*/ { id: "Before break", message: "Before break" }) : step.execution.boundary === 4 ? _(/*i18n*/ { id: "After break", message: "After break" }) : _(/*i18n*/ { id: "End of module", message: "End of module" }) : `${title} ${step.execution.boundary}` }})}><ArrowRight aria-hidden="true" /></span></pre> : <p role="status">{_(/*i18n*/ { id: "Loading teaching code…", message: "Loading teaching code…" })}</p>}
        </div>
        <p className="execution-status text-sm text-muted" aria-live="polite">{step.execution.returning ? _(/*i18n*/ { id: "Return value produced · caller not resumed yet", message: "Return value produced · caller not resumed yet" }) : step.execution.boundary === 0 ? _(/*i18n*/ { id: "Before the first core statement · intermediate state", message: "Before the first core statement · intermediate state" }) : take ? step.execution.boundary === 1 ? _(/*i18n*/ { id: "Queue head removed; current event not matched or bound yet · intermediate state", message: "Queue head removed; current event not matched or bound yet · intermediate state" }) : step.action === 'take-empty' ? _(/*i18n*/ { id: "Queue empty; exit the loop", message: "Queue empty; exit the loop" }) : step.execution.boundary === 2 ? _(/*i18n*/ { id: "point and event bound; event-taking module complete", message: "point and event bound; event-taking module complete" }) : _(/*i18n*/ { id: "Replaying actual control flow · intermediate state", message: "Replaying actual control flow · intermediate state" }) : context.locals.some(variable => variable.name === 'return_value' && variable.availability === 'available') ? _(/*i18n*/ { id: "Current function returned", message: "Current function returned" }) : _(/*i18n*/ { id: "Replaying actual control flow · intermediate state", message: "Replaying actual control flow · intermediate state" })}{step.execution.blocks.map(block => {
          const keyword = step.execution.controls.find(control => control.line === block.line && ['if', 'else', 'for'].includes(control.keyword))?.keyword
          return <span key={`${block.line}:${block.phase}`}> · {block.phase === 'before' ? _(/*i18n*/ { id: "Before the end of the {keyword} block", message: "Before the end of the {keyword} block" , values: { keyword }}) : _(/*i18n*/ { id: "After the end of the {keyword} block", message: "After the end of the {keyword} block" , values: { keyword }})}</span>
        })}</p>
      </div> : <p className="text-sm">{_(/*i18n*/ { id: "This module currently provides coarse observation points, without detailed core-code steps.", message: "This module currently provides coarse observation points, without detailed core-code steps." })}</p>}
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
  const { _ } = useLingui()
  const context = step.execution.context
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const expansion = (frame: ExecutionContext, key: string, defaultExpanded: boolean) => ({
    isExpanded: expanded[`${frame.id}:${key}`] ?? defaultExpanded,
    onExpandedChange: (value: boolean) => setExpanded(current => ({ ...current, [`${frame.id}:${key}`]: value })),
  })
  const renderVariable = (variable: ExecutionVariable, kind: ExecutionVariableKind, frame: ExecutionContext) => {
    const { changed } = variableChange(variable, kind, step, previous, undefined, frame, _)
    const hasValue = hasVariableValue(variable)
    const shadowed = variable.availability === 'shadowed' && hasValue
    const value = variableValue(shadowed ? { ...variable, availability: 'available' } : variable, values, _)
    const multiline = hasValue && value.includes('\n')
    const suffix = `: ${variable.type} = `
    const state = expansion(frame, `${kind}:${variable.scope}:${variable.name}`, false)
    if (multiline) return <Disclosure key={variable.name} {...state} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} context={frame} step={step} previous={previous} values={values} disclosure indicator={<ExecutionDisclosureIndicator expanded={state.isExpanded} />}>
        <VariableCode>{suffix}</VariableCode>{!state.isExpanded && <VariableCode>{formatExecutionValue(value, 'summary')}</VariableCode>}
      </ExecutionVariableSymbol>{shadowed && !state.isExpanded && <span className="text-muted">{_(shadowedValueNote)}</span>}</dt>
      <dd><Disclosure.Content>{state.isExpanded && <Disclosure.Body className="execution-variable-value"><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{_(shadowedValueNote)}</span>}</Disclosure.Body>}</Disclosure.Content></dd>
    </Disclosure>
    return <div key={variable.name} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><ExecutionVariableSymbol variable={variable} kind={kind} context={frame} step={step} previous={previous} values={values}><VariableCode>{variable.name}</VariableCode></ExecutionVariableSymbol><VariableCode>{suffix}</VariableCode></dt>
      <dd className={hasValue ? undefined : 'text-muted'}>{hasValue ? <><VariableCode>{value}</VariableCode>{shadowed && <span className="text-muted">{_(shadowedValueNote)}</span>}</> : value}</dd>
    </div>
  }
  return <section aria-label={_(/*i18n*/ { id: "Core variables", message: "Core variables" })} className="learning-panel learning-variables"><Card className="learning-panel-card">
    <CardHeader><CardTitle render={props => <h2 {...props} />}>{_(/*i18n*/ { id: "Core variables", message: "Core variables" })}</CardTitle></CardHeader>
    <CardContent className="learning-panel-content execution-context">
      {[context, ...step.execution.outer.toReversed()].map(frame => <section key={frame.id} aria-label={frame === context ? _(/*i18n*/ { id: "Current execution context", message: "Current execution context" }) : _(/*i18n*/ { id: "Outer execution context {functionName}", message: "Outer execution context {functionName}" , values: { functionName: frame.function }})} data-context-id={frame.id}>
        <div className="flex items-center gap-1">
        <h3>{frame === context ? _(/*i18n*/ { id: "Current function", message: "Current function" }) : _(/*i18n*/ { id: "Outer function", message: "Outer function" })}：<VariableCode>{frame.function}</VariableCode></h3>
        <Tooltip>
          <Button isIconOnly variant="ghost" size="sm" aria-label={_(/*i18n*/ { id: "About core variables", message: "About core variables" })}><Info size={16} aria-hidden="true" /></Button>
          <Tooltip.Content placement="bottom" className="execution-context-tooltip">
        <p className="execution-context-description text-sm text-muted"><Trans id="Core context at this step.">Core context at this step. <VariableCode>queue</VariableCode>, <VariableCode>next</VariableCode>, <VariableCode>point</VariableCode>, <VariableCode>current</VariableCode>, and sweep segments use sweep coordinates <VariableCode>{`x′ = x + ${formatRational(shear)} · y`}</VariableCode>; <VariableCode>result</VariableCode> and the canvas use original coordinates. The same-point grouping is an event teaching summary, not a local variable.</Trans>{frame.function === 'sweep' && <Trans id="The segments parameter is shadowed.">The parameter <VariableCode>segments</VariableCode> is shadowed by a local variable with the same name.</Trans>}</p>
          </Tooltip.Content>
        </Tooltip>
        </div>
        {(['parameters', 'captures', 'locals'] as const).filter(kind => kind !== 'captures' || frame.captures.length > 0).map(kind => <Disclosure key={kind} {...expansion(frame, kind, true)}>
          <Disclosure.Heading level={4}><Disclosure.Trigger className="flex w-full items-center gap-2 text-left"><ExecutionDisclosureIndicator expanded={expansion(frame, kind, true).isExpanded} />{kind === 'parameters' ? _(/*i18n*/ { id: "Core parameters", message: "Core parameters" }) : kind === 'captures' ? _(/*i18n*/ { id: "Captured variables", message: "Captured variables" }) : _(/*i18n*/ { id: "Core local variables", message: "Core local variables" })}</Disclosure.Trigger></Disclosure.Heading>
          <Disclosure.Content><Disclosure.Body><dl>{frame[kind].map(variable => renderVariable(variable, kind, frame))}</dl></Disclosure.Body></Disclosure.Content>
        </Disclosure>)}
      </section>)}
    </CardContent>
  </Card></section>
}
