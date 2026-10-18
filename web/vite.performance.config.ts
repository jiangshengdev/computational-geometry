// Diagnostic production build: only the catalog input changes, never the API.
import { readFileSync } from 'node:fs'
import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config.ts'

const catalog = process.env.BO_PERF_CATALOG
const outDir = process.env.BO_PERF_BUILD
if (!catalog || !outDir) throw new Error('Diagnostic build requires BO_PERF_CATALOG and BO_PERF_BUILD')
const cases: unknown = JSON.parse(readFileSync(catalog, 'utf8'))
if (!Array.isArray(cases) || !cases.length) throw new Error('Diagnostic catalog must be nonempty')

export default mergeConfig(base, defineConfig({
  build: { outDir },
  plugins: [{
    name: 'performance-case-inputs',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/algorithms/segment-intersection/cases/presets.ts')) return
      return `${code}\npresets.push(...${JSON.stringify(cases)});\n`
    },
  }],
}))
