import { useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { Tooltip } from '@heroui/react/tooltip'
import { Disclosure } from '@heroui/react/disclosure'
import type { ExecutionVariable, SweepStep } from './geometry'
import { controlDescription, functions, hasVariableValue, panelVariableDetails, scopedVariable, symbolScope, variableDetails, variableValue } from './executionSymbols'
import { RustCode } from './RustCode'

function SymbolValue({ variable, values }: { variable: ExecutionVariable | undefined; values: string[] }) {
  return <RustCode muted={!hasVariableValue(variable)}>{variableValue(variable, values)}</RustCode>
}

interface SymbolProps {
  name: string; kind: 'function' | 'variable' | 'control'; children: ReactNode
  line: number; displayLine: number; occurrence: number; module: string
  expression: string
  step: SweepStep; previous: SweepStep; values: string[]
}

export function ExecutionSymbol({ name, kind, line, displayLine, occurrence, module, expression, children, step, previous, values }: SymbolProps) {
  const label = kind === 'variable' ? '变量' : kind === 'control' ? '控制流' : '函数'
  return <SymbolTooltip name={name} line={line} occurrence={occurrence} label={`${label} ${name} · ${kind === 'variable' ? symbolScope(name, step.execution.module, line) : `第 ${displayLine} 行${kind === 'control' ? '关键字' : '调用'} ${occurrence + 1}`}`} content={<SymbolDetails name={name} kind={kind} line={line} occurrence={occurrence} module={module} expression={expression} step={step} previous={previous} values={values} label={label} />}>
    {children}
  </SymbolTooltip>
}

function SymbolTooltip({ name, line, occurrence, label, children, content, disclosure = false, anchor }: {
  name: string; line?: number; occurrence?: number; label: string
  children: ReactNode; content: ReactNode; disclosure?: boolean
  anchor?: RefObject<Element | null>
}) {
  const [open, setOpen] = useState(false)
  const triggerProps = {
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      // The first pointerenter after navigation precedes React Aria's modality
      // update. Actual movement over the symbol must still open its tooltip.
      if (event.pointerType !== 'touch') setOpen(true)
    },
    onPointerLeave: () => setOpen(false),
    'data-symbol': name, 'data-line': line, 'data-occurrence': occurrence, 'aria-label': label,
  }
  return <Tooltip delay={150} closeDelay={0} isOpen={open} onOpenChange={setOpen}>
    {disclosure
      ? <Disclosure.Trigger {...triggerProps} className="flex w-full items-start gap-2 text-left">{children}</Disclosure.Trigger>
      : <Tooltip.Trigger<'span'> {...triggerProps} render={props => <span {...props} tabIndex={0} />} className="execution-symbol">{children}</Tooltip.Trigger>}
    <Tooltip.Content className="execution-symbol-tooltip" placement="bottom" triggerRef={anchor}>
      {content}
    </Tooltip.Content>
  </Tooltip>
}

// Tooltip.Content owns mounting and exit animation. Resolve values only while
// its body is mounted, while keeping the trigger's accessible scope available.
function SymbolDetails({ name, kind, line, occurrence, module, expression, step, previous, values, label }: Omit<SymbolProps, 'children' | 'displayLine'> & { label: string }) {
  const detail = variableDetails(name, step, previous, values, line)
  const fn = functions[name]
  const context = step.execution.context
  const call = module === step.execution.module ? step.execution.calls.find(call => call.line === line && call.function === name && call.occurrence === occurrence) : undefined
  const control = module === step.execution.module ? step.execution.controls.find(control => control.line === line && control.keyword === name && control.occurrence === occurrence) : undefined
  const returnValue = context.locals.find(variable => variable.name === 'return_value')
  const references = [...new Set(expression.match(/[A-Za-z_][A-Za-z_0-9]*/g))]
    .map(reference => scopedVariable(reference, step, line))
    .filter(variable => variable !== undefined)
  return <div><strong>{label} <RustCode>{name}</RustCode></strong>
        {kind === 'control' ? <>
          <p>{controlDescription(name, control)}</p>
          {name === 'return' && control?.state === 'returned' && <p>返回值：<SymbolValue variable={returnValue} values={values} /></p>}
        </> : kind === 'variable' ? <VariableDescription detail={detail} /> : <>
          <p><RustCode>{fn.signature}</RustCode></p><p>{fn.purpose}</p><p>参数：{fn.parameters}</p>
          <p>调用表达式：<RustCode>{expression}</RustCode></p>
          {call ? <>
            {call.arguments.map(parameter => <p key={parameter.name}>实参 <RustCode>{parameter.name}</RustCode>：<SymbolValue variable={parameter} values={values} /></p>)}
            <p>返回值：<SymbolValue variable={call.result} values={values} /></p>
          </> : <>
            {references.map(variable => <p key={variable.name}>引用变量 <RustCode>{variable.name}</RustCode>：<SymbolValue variable={variable} values={values} /></p>)}
            <p>复合实参的求值及该调用点的返回值：<span className="text-muted">当前步骤不可用。</span></p>
          </>}
        </>}
      </div>
}

function VariableDescription({ detail }: { detail: ReturnType<typeof variableDetails> }) {
  return <>
    <p>{detail.meaning}</p><p>作用域：{detail.scope}</p><p>类型：<RustCode>{detail.type}</RustCode></p>
    <p data-value-phase="current">当前值：<RustCode muted={!detail.hasValue}>{detail.value}</RustCode></p>
    <p data-value-phase="previous">{detail.changed ? <>本步变化；之前值：<RustCode muted={!detail.previousHasValue}>{detail.previous}</RustCode></> : '本步无可比较的值变化'}</p>
  </>
}

interface VariableSymbolProps {
  variable: ExecutionVariable; kind: 'parameters' | 'locals'
  step: SweepStep; previous: SweepStep; values: string[]
  children: ReactNode; disclosure?: boolean; indicator?: ReactNode
}

export function ExecutionVariableSymbol({ children, disclosure, indicator, ...props }: VariableSymbolProps) {
  const { variable, kind } = props
  const anchor = useRef<HTMLSpanElement>(null)
  return <SymbolTooltip name={variable.name} label={disclosure ? `${variable.name}: ${variable.type}` : `变量 ${variable.name} · ${kind === 'parameters' ? '参数' : '局部变量'}`} disclosure={disclosure} anchor={disclosure ? anchor : undefined} content={<PanelVariableDescription {...props} />}>
    {disclosure ? <>
      {indicator}
      <span className="min-w-0 flex-1"><span ref={anchor} className="execution-symbol inline-block"><RustCode>{variable.name}</RustCode></span>{children}</span>
    </> : children}
  </SymbolTooltip>
}

function PanelVariableDescription({ variable, kind, step, previous, values }: Omit<VariableSymbolProps, 'children' | 'disclosure'>) {
  const detail = panelVariableDetails(variable, kind, step, previous, values)
  return <div><strong>变量 <RustCode>{variable.name}</RustCode></strong><VariableDescription detail={detail} /></div>
}
