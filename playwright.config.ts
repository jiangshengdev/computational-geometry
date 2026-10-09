import { join } from 'node:path'
import frontendConfig from './web/playwright.config'

const root = __dirname
const frontendServers = [frontendConfig.webServer ?? []].flat().map(server => ({
  ...server,
  cwd: join(root, 'web'),
}))

// Project-level orchestration; each stack keeps its own test entry point.
export default {
  ...frontendConfig,
  testDir: join(root, 'web/tests'),
  webServer: [
    {
      name: 'BO API',
      command: 'cargo run --offline',
      cwd: root,
      env: { BO_PORT: '0' },
      wait: { stdout: /BO API listening on (?<BO_API_URL>http:\/\/127\.0\.0\.1:\d+)/ },
    },
    ...frontendServers,
  ],
} satisfies typeof frontendConfig
