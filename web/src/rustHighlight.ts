export function tokenizeRust(code: string) {
  return import('shiki').then(({ codeToTokens }) => codeToTokens(code, {
    lang: 'rust', themes: { light: 'github-light', dark: 'github-dark' },
  })).then(result => result.tokens)
}
