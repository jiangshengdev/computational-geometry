import type { ReactNode } from 'react'
import { Tooltip } from '@heroui/react/tooltip'
import type { SweepStep } from './geometry'
import { functions, variableDetails, variableValue } from './executionSymbols'

export function ExecutionSymbol({ name, kind, expression, children, step, previous, values }: {
  name: string; kind: 'function' | 'variable'; children: ReactNode
  expression: string
  step: SweepStep; previous: SweepStep; values: string[]
}) {
  const detail = variableDetails(name, step, previous, values)
  const fn = functions[name]
  const next = step.execution.context.locals.find(variable => variable.name === 'next')
  const context = step.execution.context
  const inCall = context.function === name
  const returnValue = context.locals.find(variable => variable.name === 'return_value')
  const local = (name: string) => context.locals.find(variable => variable.name === name)
  const references = [...new Set(expression.match(/[A-Za-z_][A-Za-z_0-9]*/g))]
    .map(reference => context.locals.find(variable => variable.name === reference) ?? context.parameters.find(variable => variable.name === reference))
    .filter(variable => variable !== undefined)
  return <Tooltip delay={150} closeDelay={0}>
    <Tooltip.Trigger<'span'> render={props => <span {...props} tabIndex={0} />} className="execution-symbol" data-symbol={name} aria-label={`${kind === 'variable' ? '变量' : '函数'} ${name}`}>{children}</Tooltip.Trigger>
    <Tooltip.Content className="execution-symbol-tooltip" placement="bottom">
      <div><strong>{kind === 'variable' ? '变量' : '函数'} <code>{name}</code></strong>
        {kind === 'variable' ? <>
          <p>{detail.meaning}</p><p>类型：<code>{detail.type}</code></p>
          <p>当前值：<code>{detail.value}</code></p>
          <p>{detail.changed ? <>本步变化；之前：<code>{detail.previous}</code></> : '本步无可比较的值变化'}</p>
        </> : <>
          <p><code>{fn.signature}</code></p><p>{fn.purpose}</p><p>参数：{fn.parameters}</p>
          <p>调用表达式：<code>{expression}</code></p>
          {inCall ? <>
            {context.parameters.map(parameter => <p key={parameter.name}>实参 {parameter.name}：<code>{variableValue(parameter, values)}</code></p>)}
            <p>返回值：<code>{variableValue(returnValue, values)}</code></p>
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
            <p>复合实参的求值及该调用点的返回值：当前轨迹未提供。</p>
          </>}
        </>}
      </div>
    </Tooltip.Content>
  </Tooltip>
}
