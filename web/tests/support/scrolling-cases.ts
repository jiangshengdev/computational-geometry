import type { Page } from '@playwright/test'
import { segment } from '../../src/geometry/geometry'
import { type Preset } from '../../src/cases/preset'

// Only the bottom three segments intersect; the remaining rows lengthen the
// queue and active list without adding crossing events.
export const scrollingCase: Preset = {
  id: 'scrolling-test', name: '滚动定位测试', description: '默认字号下的长列表。',
  segments: [segment('-2', '-2', '2', '2'), segment('-2', '2', '2', '-2'), segment('-2', '0', '2', '0'),
    ...Array.from({ length: 12 }, (_, i) => segment('-2', String(i + 10), '2', String(i + 10)))],
  learning: { goal: '定位活动条目与新发现事件。', verification: '只有前三条线段在原点相交。' },
}

// Separate crosses produce one intersection each, extending both result lists.
export const longResultsCase: Preset = {
  id: 'long-results-test', name: '结果长列表测试', description: '默认字号下的输入和配对滚动。',
  segments: Array.from({ length: 16 }, (_, i) => [
    segment('-2', String(i * 10), '2', String(i * 10 + 4)),
    segment('-2', String(i * 10 + 4), '2', String(i * 10)),
  ]).flat(),
}

const fraction = '12345678901/10000000003'
export const longDetailsCase: Preset = {
  id: 'long-details-test', name: '长精确坐标测试', description: '默认字号下的精确详情滚动。',
  segments: [segment(`-${fraction}`, `-${fraction}`, fraction, fraction),
    segment(`-${fraction}`, fraction, fraction, `-${fraction}`)],
}

export async function installCase(page: Page, preset: Preset) {
  // Extend only the catalog input. The UI still calls the real HTTP/BO API.
  await page.route('**/src/cases/presets.ts', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, body: `${await response.text()}\npresets.push(${JSON.stringify(preset)});\n` })
  })
}
