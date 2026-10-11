import { useState, type ReactNode } from 'react'
import { Tooltip } from '@heroui/react/tooltip'
import type { ExecutionVariable, SweepStep } from './geometry'
import { functions, hasVariableValue, scopedVariable, variableDetails, variableValue } from './executionSymbols'
import { RustCode } from './RustCode'

function SymbolValue({ variable, values }: { variable: ExecutionVariable | undefined; values: string[] }) {
  return <RustCode muted={!hasVariableValue(variable)}>{variableValue(variable, values)}</RustCode>
}

export function ExecutionSymbol({ name, kind, line, displayLine, occurrence, module, expression, children, step, previous, values }: {
  name: string; kind: 'function' | 'variable'; children: ReactNode
  line: number; displayLine: number; occurrence: number; module: string
  expression: string
  step: SweepStep; previous: SweepStep; values: string[]
}) {
  const [open, setOpen] = useState(false)
  const detail = variableDetails(name, step, previous, values, line)
  const fn = functions[name]
  const next = step.execution.context.locals.find(variable => variable.name === 'next')
  const context = step.execution.context
  const call = module === step.execution.module ? step.execution.calls.find(call => call.line === line && call.function === name && call.occurrence === occurrence) : undefined
  const returnValue = context.locals.find(variable => variable.name === 'return_value')
  const local = (name: string) => context.locals.find(variable => variable.name === name)
  const references = [...new Set(expression.match(/[A-Za-z_][A-Za-z_0-9]*/g))]
    .map(reference => scopedVariable(reference, step, line))
    .filter(variable => variable !== undefined)
  return <Tooltip delay={150} closeDelay={0} isOpen={open} onOpenChange={setOpen}>
    <Tooltip.Trigger<'span'> render={props => <span {...props} tabIndex={0} />} onPointerMove={event => {
      // The first pointerenter after navigation precedes React Aria's modality
      // update. Actual movement over the symbol must still open its tooltip.
      if (event.pointerType !== 'touch') setOpen(true)
    }} onPointerLeave={() => setOpen(false)} className="execution-symbol" data-symbol={name} data-line={line} data-occurrence={occurrence} aria-label={`${kind === 'variable' ? '变量' : '函数'} ${name} · ${kind === 'variable' ? detail.scope : `第 ${displayLine} 行调用 ${occurrence + 1}`}`}>{children}</Tooltip.Trigger>
    <Tooltip.Content className="execution-symbol-tooltip" placement="bottom">
      <div><strong>{kind === 'variable' ? '变量' : '函数'} <RustCode>{name}</RustCode></strong>
        {kind === 'variable' ? <>
          <p>{detail.meaning}</p><p>作用域：{detail.scope}</p><p>类型：<RustCode>{detail.type}</RustCode></p>
          <p data-value-phase="current">当前值：<RustCode muted={!detail.hasValue}>{detail.value}</RustCode></p>
          <p data-value-phase="previous">{detail.changed ? <>本步变化；之前值：<RustCode muted={!detail.previousHasValue}>{detail.previous}</RustCode></> : '本步无可比较的值变化'}</p>
        </> : <>
          <p><RustCode>{fn.signature}</RustCode></p><p>{fn.purpose}</p><p>参数：{fn.parameters}</p>
          <p>调用表达式：<RustCode>{expression}</RustCode></p>
          {call ? <>
            {call.arguments.map(parameter => <p key={parameter.name}>实参 <RustCode>{parameter.name}</RustCode>：<SymbolValue variable={parameter} values={values} /></p>)}
            <p>返回值：<SymbolValue variable={call.result} values={values} /></p>
          </> : name === 'intersection_candidate' && step.execution.module === 'geometry' ? <>
            {['a', 'b'].map(name => <p key={name}>实参 <RustCode>{name}</RustCode>：<SymbolValue variable={local(name)} values={values} /></p>)}
            <p>返回值：{step.execution.boundary! < 4 ? <RustCode muted>尚未调用，返回值不可用</RustCode> : <SymbolValue variable={local('point')?.availability === 'available' ? local('point') : returnValue} values={values} />}</p>
          </> : name === 'schedule_neighbors' && step.execution.module === 'neighbors' ? <>
            {['active', 'lower', 'segments', 'point', 'queue', 'checked'].map(name => <p key={name}>实参 <RustCode>{name}</RustCode>：<SymbolValue variable={local(name)} values={values} /></p>)}
            <p>返回值：<SymbolValue variable={local('candidate')} values={values} /></p>
          </> : name === 'pop_first' && step.execution.module === 'take' ? <>
            <p>实参：无显式参数；接收者 <RustCode>queue</RustCode>。</p>
            <p>返回值：{next?.availability === 'unassigned' ? <RustCode muted>尚未调用，返回值不可用</RustCode> : <SymbolValue variable={next} values={values} />}</p>
          </> : <>
            {references.map(variable => <p key={variable.name}>引用变量 <RustCode>{variable.name}</RustCode>：<SymbolValue variable={variable} values={values} /></p>)}
            <p>复合实参的求值及该调用点的返回值：<span className="text-muted">当前步骤不可用。</span></p>
          </>}
        </>}
      </div>
    </Tooltip.Content>
  </Tooltip>
}
