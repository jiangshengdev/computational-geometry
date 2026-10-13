import { type PointerEvent, type ReactNode, useContext, useEffect, useState } from 'react'
import { Popover, popoverVariants } from '@heroui/react/popover'
import { TooltipTrigger as FocusableTrigger } from '@heroui/react/tooltip'
import { Button } from '@heroui/react/button'
import { Disclosure } from '@heroui/react/disclosure'
import { Minus, Plus } from 'lucide-react'
import { PreviewTrigger } from 'react-aria-components/PreviewTrigger'
import { OverlayTriggerStateContext } from 'react-aria-components/Dialog'
import { setInteractionModality } from 'react-aria/useFocusVisible'
import type { ExecutionContext, ExecutionVariable, ExecutionVariableKind, SweepStep } from '../geometry/geometry'
import { controlDescription, functions, hasVariableValue, panelVariableDetails, scopedVariable, shadowedValueNote, symbolScope, variableDetails, variableValue } from './executionSymbols'
import { RustCode } from './RustCode'
import { type Access, accessDetails, accessParents } from './executionAccess'

function PreviewValue({ value, hasValue }: { value: string; hasValue: boolean }) {
  const shadowed = hasValue && value.endsWith(shadowedValueNote)
  return <><RustCode muted={!hasValue}>{shadowed ? value.slice(0, -shadowedValueNote.length) : value}</RustCode>{shadowed && <span className="text-muted">{shadowedValueNote}</span>}</>
}

function SymbolValue({ variable, values }: { variable: ExecutionVariable | undefined; values: string[] }) {
  return <PreviewValue value={variableValue(variable, values)} hasValue={hasVariableValue(variable)} />
}

interface SymbolProps {
  name: string; kind: 'function' | 'variable' | 'control' | 'access'; children: ReactNode
  access?: Access
  line: number; displayLine: number; occurrence: number; module: string
  expression: string
  step: SweepStep; previous: SweepStep; values: string[]
}

export function ExecutionSymbol({ name, kind, access, line, displayLine, occurrence, module, expression, children, step, previous, values }: SymbolProps) {
  const [depth, setDepth] = useState(0)
  let maximum = 0
  for (let parent = access?.parent; parent; parent = parent.parent) maximum++
  const changeDepth = (delta: number) => setDepth(depth => Math.max(0, Math.min(maximum, depth + delta)))
  const onKeyDown = (event: KeyboardEvent) => {
    if (!maximum || event.altKey || event.ctrlKey || event.metaKey) return
    if (['+', '-', '−'].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      changeDepth(event.key === '+' ? 1 : -1)
    }
  }
  const label = kind === 'variable' ? '变量' : kind === 'access' ? '访问' : kind === 'control' ? '控制流' : '函数'
  return <SymbolTooltip placement="bottom" name={name} line={line} occurrence={occurrence} onKeyDown={onKeyDown} onClose={() => setDepth(0)} label={`${label} ${access?.expression ?? name} · ${kind === 'variable' ? symbolScope(name, step.execution.module, line) : `第 ${displayLine} 行${kind === 'control' ? '关键字' : '调用'} ${occurrence + 1}`}`} content={<>
    <SymbolDetails name={name} kind={kind} access={access} line={line} occurrence={occurrence} module={module} expression={expression} step={step} previous={previous} values={values} label={label} />
    {access && <ParentValues access={access} step={step} values={values} line={line} depth={depth} maximum={maximum} changeDepth={changeDepth} />}
  </>}>
    {children}
  </SymbolTooltip>
}

function SymbolTooltip({ name, line, occurrence, label, children, content, placement, disclosure = false, onKeyDown, onClose }: {
  name: string; line?: number; occurrence?: number; label: string
  children: ReactNode; content: ReactNode; disclosure?: boolean
  placement: 'bottom' | 'left top'
  onKeyDown?: (event: KeyboardEvent) => void; onClose?: () => void
}) {
  const pointerModality = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') setInteractionModality('pointer')
  }
  const triggerProps = { 'data-symbol': name, 'data-line': line, 'data-occurrence': occurrence, 'aria-label': label,
    // React may synthesize the next enter from the previous target's out event.
    // Set actual pointer modality before either path reaches PreviewTrigger.
    onPointerOverCapture: pointerModality, onPointerOutCapture: pointerModality,
  }
  // PreviewTrigger owns hover/focus/close state. A Popover.Root would add a
  // competing DialogTrigger; use HeroUI's public styles with its Content.
  // Include the dialog padding without mounting Dialog, which moves focus on open.
  return <PreviewTrigger delay={150} closeDelay={0} onOpenChange={open => { if (!open) onClose?.() }}>
    {disclosure
      ? <Disclosure.Trigger {...triggerProps} className="flex w-full items-start gap-2 text-left">{children}</Disclosure.Trigger>
      // HeroUI's focusable trigger also works while a panel is inert behind a
      // modal; Pressable's mount-time focus assertion rejects that valid state.
      : <FocusableTrigger<'span'> {...triggerProps} render={props => <span {...props} tabIndex={0} />} className="execution-symbol">{children}</FocusableTrigger>}
    <Popover.Content className={popoverVariants().base({ className: popoverVariants().dialog({ className: 'execution-symbol-tooltip' }) })} placement={placement} aria-label={disclosure ? `变量 ${name} · ${label}` : label}>
      <ActivePreviewShortcuts onKeyDown={onKeyDown} />
      {content}
    </Popover.Content>
  </PreviewTrigger>
}

function ActivePreviewShortcuts({ onKeyDown }: { onKeyDown?: (event: KeyboardEvent) => void }) {
  const state = useContext(OverlayTriggerStateContext)!
  useEffect(() => {
    if (!state.isOpen) return
    // Hover does not move focus. Bridge keys only during this preview's active
    // lifetime; the library still owns dismissal, focus and overlay state.
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') { state.close(); return }
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return
      onKeyDown?.(event)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [state, onKeyDown])
  return null
}

function ParentValues({ access, step, values, line, depth, maximum, changeDepth }: {
  access: Access; step: SweepStep; values: string[]; line: number
  depth: number; maximum: number; changeDepth: (delta: number) => void
}) {
  const parents = accessParents(access, step, values, line)
  return <>
    <div className="flex items-center gap-2 mt-2" aria-label="parent 显示深度">
      <Button isIconOnly size="sm" variant="secondary" aria-label="减少 parent 深度" isDisabled={depth === 0} onPress={() => changeDepth(-1)}><Minus size={16} aria-hidden="true" /></Button>
      <span>parent 深度：{depth}</span>
      <Button isIconOnly size="sm" variant="secondary" aria-label="增加 parent 深度" isDisabled={depth === maximum} onPress={() => changeDepth(1)}><Plus size={16} aria-hidden="true" /></Button>
    </div>
    {parents.slice(0, depth).map(parent => <p key={parent.expression} data-parent={parent.expression}><RustCode>{parent.expression}</RustCode>：<PreviewValue value={parent.value} hasValue={parent.hasValue} /></p>)}
  </>
}

// Popover.Content owns mounting and exit animation. Resolve values only while
// its body is mounted, while keeping the trigger's accessible scope available.
function SymbolDetails({ name, kind, access, line, occurrence, module, expression, step, previous, values, label }: Omit<SymbolProps, 'children' | 'displayLine'> & { label: string }) {
  const detail = access ? accessDetails(access, step, previous, values, line) : variableDetails(name, step, previous, values, line)
  const fn = functions[name]
  const context = step.execution.context
  const call = module === step.execution.module ? step.execution.calls.find(call => call.line === line && call.function === name && call.occurrence === occurrence) : undefined
  const control = module === step.execution.module ? step.execution.controls.find(control => control.line === line && control.keyword === name && control.occurrence === occurrence) : undefined
  const returnValue = context.locals.find(variable => variable.name === 'return_value')
  const references = [...new Set(expression.match(/[A-Za-z_][A-Za-z_0-9]*/g))]
    .map(reference => scopedVariable(reference, step, line))
    .filter(variable => variable !== undefined)
  return <div><strong>{label} <RustCode>{access?.expression ?? name}</RustCode></strong>
        {kind === 'control' ? <>
          <p>{controlDescription(name, control)}</p>
          {name === 'return' && control?.state === 'returned' && <p>返回值：<SymbolValue variable={returnValue} values={values} /></p>}
        </> : kind === 'variable' || kind === 'access' ? <VariableDescription detail={detail} /> : <>
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
    <p data-value-phase="current">当前值：<PreviewValue value={detail.value} hasValue={detail.hasValue} /></p>
    <p data-value-phase="previous">{detail.changed ? <>本步变化；之前值：<PreviewValue value={detail.previous} hasValue={detail.previousHasValue} /></> : '本步无可比较的值变化'}</p>
  </>
}

interface VariableSymbolProps {
  variable: ExecutionVariable; kind: ExecutionVariableKind; context?: ExecutionContext
  step: SweepStep; previous: SweepStep; values: string[]
  children: ReactNode; disclosure?: boolean; indicator?: ReactNode
}

export function ExecutionVariableSymbol({ children, disclosure, indicator, ...props }: VariableSymbolProps) {
  const { variable, kind } = props
  return <SymbolTooltip placement="left top" name={variable.name} label={disclosure ? `${variable.name}: ${variable.type}` : `变量 ${variable.name} · ${kind === 'parameters' ? '参数' : kind === 'captures' ? '捕获变量' : '局部变量'}`} disclosure={disclosure} content={<PanelVariableDescription {...props} />}>
    {disclosure ? <>
      {indicator}
      <span className="min-w-0 flex-1"><span className="execution-symbol inline-block"><RustCode>{variable.name}</RustCode></span>{children}</span>
    </> : children}
  </SymbolTooltip>
}

function PanelVariableDescription({ variable, kind, step, previous, values, context }: Omit<VariableSymbolProps, 'children' | 'disclosure'>) {
  const detail = panelVariableDetails(variable, kind, step, previous, values, context)
  return <div><strong>变量 <RustCode>{variable.name}</RustCode></strong><VariableDescription detail={detail} /></div>
}
