import { useEffect, useState, type CSSProperties } from 'react'
import type { ThemedToken } from 'shiki'
import { tokenizeRust } from './rustHighlight'

export function RustCode({ children: source, muted = false }: { children: string; muted?: boolean }) {
  const [highlight, setHighlight] = useState<{ source: string; tokens: ThemedToken[][] } | null>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  useEffect(() => {
    if (muted) return
    let active = true
    void tokenizeRust(source).then(tokens => {
      if (active) { setHighlight({ source, tokens }); setFailedSource(null) }
    }, () => { if (active) setFailedSource(source) })
    return () => { active = false }
  }, [source, muted])
  if (muted) return <code className="execution-variable-code text-muted">{source}</code>
  return <><code className="execution-variable-code" data-multiline={source.includes('\n')}>{highlight?.source === source ? highlight.tokens.map((line, index) => <span key={index}>{index > 0 && '\n'}{line.map((token, tokenIndex) => <span key={tokenIndex} style={{ color: token.color, ...token.htmlStyle } as CSSProperties}>{token.content}</span>)}</span>) : source}</code>{failedSource === source && <span role="alert" className="text-muted">（代码高亮加载失败）</span>}</>
}
