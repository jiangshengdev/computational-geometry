import { defineConfig } from '@lingui/cli'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'zh-CN'],
  catalogs: [{ path: '<rootDir>/src/locales/{locale}/messages', include: ['<rootDir>/src'] }],
  format: 'po',
  compileNamespace: 'ts',
})
