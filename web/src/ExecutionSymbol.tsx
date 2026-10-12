import { useState, type ReactNode } from 'react'
import { Tooltip } from '@heroui/react/tooltip'
import type { ExecutionVariable, SweepStep } from './geometry'
import { controlDescription, functions, hasVariableValue, scopedVariable, symbolScope, variableDetails, variableValue } from './executionSymbols'
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
  const [open, setOpen] = useState(false)
  const label = kind === 'variable' ? '变量' : kind === 'control' ? '控制流' : '函数'
  return <Tooltip delay={150} closeDelay={0} isOpen={open} onOpenChange={setOpen}>
    <Tooltip.Trigger<'span'> render={props => <span {...props} tabIndex={0} />} onPointerMove={event => {
      // The first pointerenter after navigation precedes React Aria's modality
      // update. Actual movement over the symbol must still open its tooltip.
      if (event.pointerType !== 'touch') setOpen(true)
    }} onPointerLeave={() => setOpen(false)} className="execution-symbol" data-symbol={name} data-line={line} data-occurrence={occurrence} aria-label={`${label} ${name} · ${kind === 'variable' ? symbolScope(name, step.execution.module, line) : `第 ${displayLine} 行${kind === 'control' ? '关键字' : '调用'} ${occurrence + 1}`}`}>{children}</Tooltip.Trigger>
    <Tooltip.Content className="execution-symbol-tooltip" placement="bottom">
      <SymbolDetails name={name} kind={kind} line={line} occurrence={occurrence} module={module} expression={expression} step={step} previous={previous} values={values} label={label} />
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
        </> : kind === 'variable' ? <>
          <p>{detail.meaning}</p><p>作用域：{detail.scope}</p><p>类型：<RustCode>{detail.type}</RustCode></p>
          <p data-value-phase="current">当前值：<RustCode muted={!detail.hasValue}>{detail.value}</RustCode></p>
          <p data-value-phase="previous">{detail.changed ? <>本步变化；之前值：<RustCode muted={!detail.previousHasValue}>{detail.previous}</RustCode></> : '本步无可比较的值变化'}</p>
        </> : <>
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
