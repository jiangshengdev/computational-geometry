import { useState, type ReactNode } from 'react'
import { Tooltip } from '@heroui/react/tooltip'
import type { SweepStep } from './geometry'
import { functions, scopedVariable, variableDetails, variableValue } from './executionSymbols'

export function ExecutionSymbol({ name, kind, line, occurrence, module, expression, children, step, previous, values }: {
  name: string; kind: 'function' | 'variable'; children: ReactNode
  line: number; occurrence: number; module: string
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
    }} onPointerLeave={() => setOpen(false)} className="execution-symbol" data-symbol={name} data-line={line} data-occurrence={occurrence} aria-label={`${kind === 'variable' ? '变量' : '函数'} ${name} · ${kind === 'variable' ? detail.scope : `第 ${line} 行调用 ${occurrence + 1}`}`}>{children}</Tooltip.Trigger>
    <Tooltip.Content className="execution-symbol-tooltip" placement="bottom">
      <div><strong>{kind === 'variable' ? '变量' : '函数'} <code>{name}</code></strong>
        {kind === 'variable' ? <>
          <p>{detail.meaning}</p><p>作用域：{detail.scope}</p><p>类型：<code>{detail.type}</code></p>
          <p>当前值：<code>{detail.value}</code></p>
          <p>{detail.changed ? <>本步变化；之前：<code>{detail.previous}</code></> : '本步无可比较的值变化'}</p>
        </> : <>
          <p><code>{fn.signature}</code></p><p>{fn.purpose}</p><p>参数：{fn.parameters}</p>
          <p>调用表达式：<code>{expression}</code></p>
          {call ? <>
            {call.arguments.map(parameter => <p key={parameter.name}>实参 {parameter.name}：<code>{variableValue(parameter, values)}</code></p>)}
            <p>返回值：<code>{variableValue(call.result, values)}</code></p>
          </> : name === 'intersection_candidate' && step.execution.module === 'geometry' ? <>
            {['a', 'b'].map(name => <p key={name}>实参 {name}：<code>{variableValue(local(name), values)}</code></p>)}
            <p>返回值：<code>{step.execution.boundary! < 4 ? '尚未调用，返回值不可用' : local('point')?.availability === 'available' ? variableValue(local('point'), values) : variableValue(returnValue, values)}</code></p>
          </> : name === 'schedule_neighbors' && step.execution.module === 'neighbors' ? <>
            {['active', 'lower', 'segments', 'point', 'queue', 'checked'].map(name => <p key={name}>实参 {name}：<code>{variableValue(local(name), values)}</code></p>)}
            <p>返回值：<code>{variableValue(local('candidate'), values)}</code></p>
          </> : name === 'pop_first' && step.execution.module === 'take' ? <>
            <p>实参：无显式参数；接收者 queue。</p>
            <p>返回值：<code>{next?.availability === 'unassigned' ? '尚未调用，返回值不可用' : variableValue(next, values)}</code></p>
          </> : <>
            {references.map(variable => <p key={variable.name}>引用变量 {variable.name}：<code>{variableValue(variable, values)}</code></p>)}
            <p>复合实参的求值及该调用点的返回值：当前步骤不可用。</p>
          </>}
        </>}
      </div>
    </Tooltip.Content>
  </Tooltip>
}
