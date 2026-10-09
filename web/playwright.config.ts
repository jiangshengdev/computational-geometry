import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  testDir: './tests',
  outputDir: join(tmpdir(), 'computational-geometry-playwright'),
  reporter: 'dot',
  use: { headless: true },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 0 --strictPort',
    // Playwright passes this captured URL to its baseURL fixture.
    wait: { stdout: /Local:\s+(?<PLAYWRIGHT_TEST_BASE_URL>http:\/\/127\.0\.0\.1:\d+\/)/ },
  },
})
