import type { HighlighterCore } from 'shiki/core'

let highlighter: Promise<HighlighterCore> | undefined

export function tokenizeRust(code: string) {
  highlighter ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/oniguruma'),
    import('shiki/langs/rust.mjs'),
    import('shiki/themes/github-light.mjs'),
    import('shiki/themes/github-dark.mjs'),
  ]).then(([{ createHighlighterCore }, { createOnigurumaEngine }, rust, light, dark]) => createHighlighterCore({
    langs: [rust.default],
    themes: [light.default, dark.default],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  }))

  return highlighter.then(instance => instance.codeToTokens(code, {
    lang: 'rust', themes: { light: 'github-light', dark: 'github-dark' },
  })).then(result => result.tokens)
}
