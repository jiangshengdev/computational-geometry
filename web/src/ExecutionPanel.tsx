import { useEffect, useState, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import type { ThemedToken } from 'shiki'
import { formatRational, type ExecutionVariable, type Rational, type SweepStep } from './geometry'

// These two statements correspond to the actual pop and pattern match in sweep.
const takeCode = 'let next = queue.pop_first();\nlet Some((point, event)) = next else { break; };'
let highlightedTake: Promise<ThemedToken[][]> | undefined
function loadTakeCode() {
  highlightedTake ??= import('shiki').then(({ codeToTokens }) => codeToTokens(takeCode, {
    lang: 'rust', themes: { light: 'github-light', dark: 'github-dark' },
  })).then(result => result.tokens)
  return highlightedTake
}

export function ExecutionPanel({ step, previous, shear, values }: {
  step: SweepStep; previous: SweepStep; shear: Rational; values: string[]
}) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null)
  const [error, setError] = useState(false)
  const take = step.execution.module === 'take'
  useEffect(() => {
    let active = true
    void loadTakeCode().then(result => { if (active) setTokens(result) }, () => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  const context = step.execution.context
  const prior = previous.execution.context
  const renderVariable = (variable: ExecutionVariable, kind: 'parameters' | 'locals') => {
    const old = prior.function === context.function ? prior[kind].find(item => item.name === variable.name) : undefined
    const changed = !!old && (old.value !== variable.value || old.availability !== variable.availability)
    return <div key={variable.name} className="execution-variable" data-changed={changed} data-testid={`variable-${variable.name}`}>
      <dt><code>{variable.name}</code> <span className="text-muted">{variable.type}</span>{changed && <span className="execution-change">本步变化</span>}</dt>
      <dd>{variable.availability === 'available' && variable.value !== null ? values[variable.value] : variable.availability === 'unassigned' ? '未赋值' : '不可用（当前作用域未提供）'}</dd>
    </div>
  }
  return <section aria-label="核心代码回放" className="learning-panel learning-code"><Card className="learning-panel-card">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <CardTitle render={props => <h2 {...props} />}>核心代码回放</CardTitle>
    </CardHeader>
    <CardContent className="learning-panel-content execution-content">
      {take ? <div className="execution-source">
        <p className="text-sm">教学代码 · Rust 风格精简片段 · <code>sweep</code> / 取事件</p>
        <p className="text-sm" aria-live="polite">{step.execution.boundary === 0 ? '第一条核心语句之前 · 中间状态' : step.execution.boundary === 1 ? '已取出队首；尚未匹配并绑定当前事件 · 中间状态' : step.action === 'take-empty' ? '队列为空，退出循环' : '已绑定 point 与 event；取事件模块完成'}</p>
        <div className="execution-code-scroll" tabIndex={0} role="region" aria-label="取事件教学代码">
          {error ? <p role="alert">教学代码高亮加载失败，请刷新重试。</p> : tokens ? <pre className="execution-code"><code>
            {tokens.map((line, index) => <span className="code-line" key={index}>{line.map((token, tokenIndex) => <span key={tokenIndex} style={{ color: token.color, ...token.htmlStyle } as CSSProperties}>{token.content}</span>)}{'\n'}</span>)}
          </code><span className="execution-boundary" role="img" aria-label={`执行边界：${step.execution.boundary === 0 ? '取事件之前' : step.execution.boundary === 1 ? '匹配之前' : '模块结束'}`} style={{ top: `calc(.75rem + ${step.execution.boundary} * 1.75rem)` }}>➜</span></pre> : <p role="status">加载教学代码…</p>}
        </div>
      </div> : <p className="text-sm">当前模块仅提供大步观察点，尚未细化为核心代码小步。</p>}
      <section aria-label="当前执行上下文" className="execution-context">
        <h3>当前函数：<code>{context.function}</code></h3>
        <p className="text-sm text-muted">{take ? '取事件片段的核心上下文。' : '大步现场可用的核心上下文。'}queue、next、point 与局部 segments 使用扫描坐标 x′ = x + {formatRational(shear)} · y；result 与画布使用原坐标。同点分组为事件教学摘要，不代表局部变量。参数 segments 已被同名局部变量遮蔽。</p>
        <h4>核心参数</h4><dl>{context.parameters.map(variable => renderVariable(variable, 'parameters'))}</dl>
        <h4>核心局部变量</h4><dl>{context.locals.map(variable => renderVariable(variable, 'locals'))}</dl>
      </section>
    </CardContent>
  </Card></section>
}
