import { useLingui } from '@lingui/react'
import { type PointerEvent, type ReactNode, useContext, useEffect, useEffectEvent, useState } from 'react'
import { Popover, popoverVariants } from '@heroui/react/popover'
import { TooltipTrigger as FocusableTrigger } from '@heroui/react/tooltip'
import { Button } from '@heroui/react/button'
import { Disclosure } from '@heroui/react/disclosure'
import { Minus, Plus } from 'lucide-react'
import { PreviewTrigger } from 'react-aria-components/PreviewTrigger'
import { OverlayTriggerStateContext } from 'react-aria-components/Dialog'
import { setInteractionModality } from 'react-aria/useFocusVisible'
import type { ExecutionContext, ExecutionVariable, ExecutionVariableKind, SweepStep } from './trace'
import { controlDescription, functions, hasVariableValue, panelVariableDetails, scopedVariable, shadowedValueNote, symbolScope, variableDetails, variableValue } from './executionSymbols'
import { RustCode } from './RustCode'
import { type Access, accessDetails, accessParents } from './executionAccess'
import { callCapability } from './teachingCalls'

function PreviewValue({ value, hasValue }: { value: string; hasValue: boolean }) {
  const { _ } = useLingui()
  const note = _(shadowedValueNote)
  const shadowed = hasValue && value.endsWith(note)
  return <><RustCode muted={!hasValue}>{shadowed ? value.slice(0, -note.length) : value}</RustCode>{shadowed && <span className="text-muted">{note}</span>}</>
}

function SymbolValue({ variable, values }: { variable: ExecutionVariable | undefined; values: string[] }) {
  const { _ } = useLingui()
  return <PreviewValue value={variableValue(variable, values, _)} hasValue={hasVariableValue(variable)} />
}

interface SymbolProps {
  name: string; kind: 'function' | 'variable' | 'control' | 'access'; children: ReactNode
  access?: Access
  line: number; displayLine: number; occurrence: number; module: string
  expression: string
  step: SweepStep; previous: SweepStep; values: string[]
}

export function ExecutionSymbol({ name, kind, access, line, displayLine, occurrence, module, expression, children, step, previous, values }: SymbolProps) {
  const { _ } = useLingui()
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
  const label = kind === 'variable' ? _(/*i18n*/ { id: "Variable", message: "Variable" }) : kind === 'access' ? _(/*i18n*/ { id: "Access", message: "Access" }) : kind === 'control' ? _(/*i18n*/ { id: "Control flow", message: "Control flow" }) : _(/*i18n*/ { id: "Function", message: "Function" })
  return <SymbolTooltip placement="bottom" name={name} line={line} occurrence={occurrence} capability={kind === 'function' ? callCapability(module, line, name) : undefined} onKeyDown={onKeyDown} onClose={() => setDepth(0)} label={`${label} ${access?.expression ?? name} · ${kind === 'variable' ? symbolScope(name, step.execution.module, line, _) : kind === 'control' ? _(/*i18n*/ { id: "Line {line}, keyword {occurrence}", message: "Line {line}, keyword {occurrence}" , values: { line: String(displayLine), occurrence: String(occurrence + 1) }}) : _(/*i18n*/ { id: "Line {line}, call {occurrence}", message: "Line {line}, call {occurrence}" , values: { line: String(displayLine), occurrence: String(occurrence + 1) }})}`} content={<>
    <SymbolDetails name={name} kind={kind} access={access} line={line} occurrence={occurrence} module={module} expression={expression} step={step} previous={previous} values={values} label={label} />
    {access && <ParentValues access={access} step={step} values={values} line={line} depth={depth} maximum={maximum} changeDepth={changeDepth} />}
  </>}>
    {children}
  </SymbolTooltip>
}

function SymbolTooltip({ name, line, occurrence, capability, label, children, content, placement, disclosure = false, onKeyDown, onClose }: {
  name: string; line?: number; occurrence?: number; label: string
  capability?: 'step-in' | 'opaque'
  children: ReactNode; content: ReactNode; disclosure?: boolean
  placement: 'bottom' | 'left top'
  onKeyDown?: (event: KeyboardEvent) => void; onClose?: () => void
}) {
  const { _ } = useLingui()
  const pointerModality = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') setInteractionModality('pointer')
  }
  const triggerProps = { 'data-symbol': name, 'data-line': line, 'data-occurrence': occurrence, 'aria-label': label,
    'data-call-capability': capability,
    // React may synthesize the next enter from the previous target's out event.
    // Set actual pointer modality before either path reaches PreviewTrigger.
    onPointerOverCapture: pointerModality, onPointerOutCapture: pointerModality,
  }
  // PreviewTrigger owns hover/focus/close state. A Popover.Root would add a
  // competing DialogTrigger; use HeroUI's public styles with its Content.
  // Include the dialog padding without mounting Dialog, which moves focus on open.
  return <PreviewTrigger delay={150} closeDelay={0}>
    {disclosure
      ? <Disclosure.Trigger {...triggerProps} className="flex w-full items-start gap-2 text-left">{children}</Disclosure.Trigger>
      // HeroUI's focusable trigger also works while a panel is inert behind a
      // modal; Pressable's mount-time focus assertion rejects that valid state.
      : <FocusableTrigger<'span'> {...triggerProps} render={props => <span {...props} tabIndex={0} />} className="execution-symbol">{children}</FocusableTrigger>}
    <PreviewLifecycle onKeyDown={onKeyDown} onClose={onClose} />
    <Popover.Content maxHeight={320} className={popoverVariants().base({ className: popoverVariants().dialog({ className: 'execution-symbol-tooltip' }) })} placement={placement} aria-label={disclosure ? _(/*i18n*/ { id: "Variable {name} · {label}", message: "Variable {name} · {label}" , values: { name, label }}) : label}>
      {content}
    </Popover.Content>
  </PreviewTrigger>
}

function PreviewLifecycle({ onKeyDown, onClose }: {
  onKeyDown?: (event: KeyboardEvent) => void; onClose?: () => void
}) {
  const state = useContext(OverlayTriggerStateContext)!
  const closed = useEffectEvent(() => onClose?.())
  // A trigger-to-popover focus transfer can request close and reopen in one
  // event. Reset only after a committed close, including instant unmounts.
  useEffect(() => { if (!state.isOpen) closed() }, [state.isOpen])
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
    window.addEventListener('keydown', handle, true)
    return () => window.removeEventListener('keydown', handle, true)
  }, [state, onKeyDown])
  return null
}

function ParentValues({ access, step, values, line, depth, maximum, changeDepth }: {
  access: Access; step: SweepStep; values: string[]; line: number
  depth: number; maximum: number; changeDepth: (delta: number) => void
}) {
  const { _ } = useLingui()
  const parents = accessParents(access, step, values, line, _)
  return <>
    <div className="flex items-center gap-2 mt-2" aria-label={_(/*i18n*/ { id: "Parent display depth", message: "Parent display depth" })}>
      <Button isIconOnly size="sm" variant="secondary" aria-label={_(/*i18n*/ { id: "Decrease parent depth", message: "Decrease parent depth" })} isDisabled={depth === 0} onPress={() => changeDepth(-1)}><Minus size={16} aria-hidden="true" /></Button>
      <span>{_(/*i18n*/ { id: "Parent depth: {depth}", message: "Parent depth: {depth}" , values: { depth: String(depth) }})}</span>
      <Button isIconOnly size="sm" variant="secondary" aria-label={_(/*i18n*/ { id: "Increase parent depth", message: "Increase parent depth" })} isDisabled={depth === maximum} onPress={() => changeDepth(1)}><Plus size={16} aria-hidden="true" /></Button>
    </div>
    {parents.slice(0, depth).map(parent => <p key={parent.expression} data-parent={parent.expression}><RustCode>{parent.expression}</RustCode>：<PreviewValue value={parent.value} hasValue={parent.hasValue} /></p>)}
  </>
}

// Popover.Content owns mounting and exit animation. Resolve values only while
// its body is mounted, while keeping the trigger's accessible scope available.
function SymbolDetails({ name, kind, access, line, occurrence, module, expression, step, previous, values, label }: Omit<SymbolProps, 'children' | 'displayLine'> & { label: string }) {
  const { _ } = useLingui()
  const detail = access ? accessDetails(access, step, previous, values, line, _) : variableDetails(name, step, previous, values, line, _)
  const fn = functions[name]
  const context = step.execution.context
  const call = module === step.execution.module ? step.execution.calls.find(call => call.line === line && call.function === name && call.occurrence === occurrence) : undefined
  const control = module === step.execution.module ? step.execution.controls.find(control => control.line === line && control.keyword === name && control.occurrence === occurrence) : undefined
  const returnValue = context.locals.find(variable => variable.name === 'return_value')
  const references = [...new Set(expression.match(/[A-Za-z_][A-Za-z_0-9]*/g))]
    .map(reference => scopedVariable(reference, step, line, _))
    .filter(variable => variable !== undefined)
  return <div><strong>{label} <RustCode>{access?.expression ?? name}</RustCode></strong>
        {kind === 'control' ? <>
          <p>{controlDescription(name, control, _)}</p>
          {name === 'return' && control?.state === 'returned' && <p>{_(/*i18n*/ { id: "Return value: ", message: "Return value: " })}<SymbolValue variable={returnValue} values={values} /></p>}
        </> : kind === 'variable' || kind === 'access' ? <VariableDescription detail={detail} /> : <>
          <p>{callCapability(module, line, name) === 'step-in'
            ? _(/*i18n*/ { id: 'Step in: the replay shows this call’s internal execution.', message: 'Step in: the replay shows this call’s internal execution.' })
            : _(/*i18n*/ { id: 'Not expanded: this call executes, but its internal process is not shown.', message: 'Not expanded: this call executes, but its internal process is not shown.' })}</p>
          <p><RustCode>{fn.signature}</RustCode></p><p>{_(fn.purpose)}</p><p>{_(/*i18n*/ { id: "Parameters: ", message: "Parameters: " })}{_(fn.parameters)}</p>
          <p>{_(/*i18n*/ { id: "Call expression: ", message: "Call expression: " })}<RustCode>{expression}</RustCode></p>
          {call ? <>
            {call.arguments.map(parameter => <p key={parameter.name}>{_(/*i18n*/ { id: "Argument ", message: "Argument " })}<RustCode>{parameter.name}</RustCode>：<SymbolValue variable={parameter} values={values} /></p>)}
            <p>{_(/*i18n*/ { id: "Return value: ", message: "Return value: " })}<SymbolValue variable={call.result} values={values} /></p>
          </> : <>
            {references.map(variable => <p key={variable.name}>{_(/*i18n*/ { id: "Referenced variable ", message: "Referenced variable " })}<RustCode>{variable.name}</RustCode>：<SymbolValue variable={variable} values={values} /></p>)}
            <p>{_(/*i18n*/ { id: "Compound argument evaluation and return value at this call site: ", message: "Compound argument evaluation and return value at this call site: " })}<span className="text-muted">{_(/*i18n*/ { id: "Unavailable at this step.", message: "Unavailable at this step." })}</span></p>
          </>}
        </>}
      </div>
}

function VariableDescription({ detail }: { detail: ReturnType<typeof variableDetails> }) {
  const { _ } = useLingui()
  return <>
    <p>{detail.meaning}</p><p>{_(/*i18n*/ { id: "Scope: ", message: "Scope: " })}{detail.scope}</p><p>{_(/*i18n*/ { id: "Type: ", message: "Type: " })}<RustCode>{detail.type}</RustCode></p>
    <p data-value-phase="current">{_(/*i18n*/ { id: "Current value: ", message: "Current value: " })}<PreviewValue value={detail.value} hasValue={detail.hasValue} /></p>
    <p data-value-phase="previous">{detail.changed ? <>{_(/*i18n*/ { id: "Changed in this step; previous value: ", message: "Changed in this step; previous value: " })}<PreviewValue value={detail.previous} hasValue={detail.previousHasValue} /></> : _(/*i18n*/ { id: "No comparable value change in this step", message: "No comparable value change in this step" })}</p>
  </>
}

interface VariableSymbolProps {
  variable: ExecutionVariable; kind: ExecutionVariableKind; context?: ExecutionContext
  step: SweepStep; previous: SweepStep; values: string[]
  children: ReactNode; disclosure?: boolean; indicator?: ReactNode
}

export function ExecutionVariableSymbol({ children, disclosure, indicator, ...props }: VariableSymbolProps) {
  const { _ } = useLingui()
  const { variable, kind } = props
  return <SymbolTooltip placement="left top" name={variable.name} label={disclosure ? `${variable.name}: ${variable.type}` : _(/*i18n*/ { id: "Variable {name} · {kind}", message: "Variable {name} · {kind}" , values: { name: variable.name, kind: kind === 'parameters' ? _(/*i18n*/ { id: "Parameter", message: "Parameter" }) : kind === 'captures' ? _(/*i18n*/ { id: "Captured variable", message: "Captured variable" }) : _(/*i18n*/ { id: "Local variable", message: "Local variable" }) }})} disclosure={disclosure} content={<PanelVariableDescription {...props} />}>
    {disclosure ? <>
      {indicator}
      <span className="min-w-0 flex-1"><span className="execution-symbol inline-block"><RustCode>{variable.name}</RustCode></span>{children}</span>
    </> : children}
  </SymbolTooltip>
}

function PanelVariableDescription({ variable, kind, step, previous, values, context }: Omit<VariableSymbolProps, 'children' | 'disclosure'>) {
  const { _ } = useLingui()
  const detail = panelVariableDetails(variable, kind, step, previous, values, context, _)
  return <div><strong>{_(/*i18n*/ { id: "Variable ", message: "Variable " })}<RustCode>{variable.name}</RustCode></strong><VariableDescription detail={detail} /></div>
}
