import { expect, test, expandedPanels, type Page } from './learning-test'
import { presets } from '../src/presets'
import type { SweepTrace } from '../src/geometry'
import { layoutCases } from './layout-states'

test.describe.configure({ mode: 'parallel' })

async function expectIntegerLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
  const fractional = await page.locator('main, main > *, .case-list > article, .workspace, .workspace > :not(.learning-state-panels), .learning-view, .learning-workspace, .learning-workspace > *, .learning-panel')
    .evaluateAll(elements => elements.flatMap(element => {
      const rect = element.getBoundingClientRect()
      const values = { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height }
      return Object.entries(values)
        .filter(([, value]) => Math.abs(value - Math.round(value)) > 0.001)
        .map(([axis, value]) => ({ element: element.className || element.tagName, axis, value }))
    }))
  expect(fractional).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  test.describe(`外层像素 ${browserName}`, () => {
    for (const width of [1100, 1361, 1920]) {
      browserTest(`两页三栏尺寸一致且为整数 20/60/20 ${width}px`, async ({ browser, baseURL }) => {
        const page = await browser.newPage({ baseURL, viewport: { width, height: 901 }, deviceScaleFactor: 2 })
        await expandedPanels(page.context())
        try {
          await page.goto('/cases/crossing')
          await expect(page.getByRole('radio').first()).toBeVisible()
          const columns = async (learning: boolean) => {
            await page.evaluate(() => document.fonts.ready)
            const boxes = await Promise.all([
              page.getByRole('region', { name: learning ? '同点参与线段' : '原始输入', exact: true }),
              page.getByRole('region', { name: '几何视图', exact: true }),
              learning
                ? page.getByRole('region', { name: '当前事件', exact: true })
                : page.getByRole('complementary', { name: '计算结果' }),
            ].map(async locator => {
              await expect(locator).toBeVisible()
              const box = (await locator.boundingBox())!
              return { x: box.x, width: box.width }
            }))
            return boxes
          }
          const results = await columns(false)
          await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
          await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
          expect(await columns(true)).toEqual(results)
          const available = results.reduce((sum, box) => sum + box.width, 0)
          const side = Math.floor(available * 0.2)
          expect(results.map(box => box.width)).toEqual([side, available - 2 * side, side])
          for (const box of results) {
            expect(Number.isInteger(box.x)).toBe(true)
            expect(Number.isInteger(box.width)).toBe(true)
          }
          await page.getByRole('link', { name: '返回结果查看器', exact: true }).click()
          expect(await columns(false)).toEqual(results)
        } finally {
          await page.close()
        }
      })
    }
    for (const width of [391, 1361]) for (const example of [null, ...layoutCases]) {
      const preset = example ? presets.find(preset => preset.id === example.id)! : null
      browserTest(`${preset ? `${preset.name}代表性教学布局` : '列表与结果'} ${width}px`, async ({ browser, baseURL }) => {
        test.setTimeout(180_000)
        const page = await browser.newPage({ baseURL, deviceScaleFactor: 2, reducedMotion: 'reduce' })
        await expandedPanels(page.context())
        try {
          await page.setViewportSize({ width, height: 901 })
          const errors: string[] = []
          page.on('pageerror', error => errors.push(error.message))
          if (!example || !preset) {
            await page.goto('/')
            await expectIntegerLayout(page)
            await page.goto('/cases/mixed-horizontal')
            await expect(page.getByRole('radio').first()).toBeVisible()
            await expectIntegerLayout(page)
          } else {
            const slider = page.getByRole('slider', { name: '教学步骤' })
            const [response] = await Promise.all([
              page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST'),
              page.goto(`/cases/${preset.id}/learn`).then(() => expect(slider).toHaveValue('0')),
            ])
            expect(response.status()).toBe(200)
            expect(response.request().postDataJSON()).toEqual({ segments: preset.segments, trace: true })
            const { trace }: { trace: SweepTrace } = await response.json()
            await expect(slider).toHaveAttribute('max', String(trace.steps.length - 1))
            for (const state of example.states) {
              const step = trace.steps.findIndex(state.matches)
              expect(step, `${preset.id}: ${state.reason}`).toBeGreaterThanOrEqual(0)
              await test.step(`${preset.id}, step ${step}: ${state.reason}`, async () => {
                // Direct URL restoration selects a layout state without replaying
                // every intermediate action. Navigation/scroll contracts stay in
                // learning-url, learning-scroll and the teaching journey specs.
                await page.goto(`/cases/${preset.id}/learn?step=${step}`)
                await expect(slider).toHaveValue(String(step))
                await expect(page.getByRole('region', { name: '操作解释' })).toContainText(state.text)
                await expect(page.getByRole('region', { name: '待处理事件队列' }).getByRole('listitem')).toHaveCount(trace.steps[step].pending.length)
                await expect(page.getByTestId('active-order').getByRole('listitem')).toHaveCount(trace.steps[step].active.length)
                await expectIntegerLayout(page)
              })
            }
          }
          expect(errors).toEqual([])
        } finally {
          await page.close()
        }
      })
    }
  })
}
