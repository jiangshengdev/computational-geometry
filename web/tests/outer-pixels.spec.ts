import { expect, test, type Page } from '@playwright/test'
import { presets } from '../src/presets'

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
  test.describe(`外层像素 ${browserName}`, () => {
    for (const width of [1100, 1361, 1920]) {
      test(`两页三栏尺寸一致且为整数 20/60/20 ${width}px`, async ({ playwright, baseURL }) => {
        const browser = await playwright[browserName].launch({ headless: true })
        try {
          const page = await browser.newPage({ baseURL, viewport: { width, height: 901 }, deviceScaleFactor: 2 })
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
          await browser.close()
        }
      })
    }
    // Each independent journey keeps its own timeout as the case library grows.
    for (const width of [391, 1361]) for (const preset of [null, ...presets.filter(preset => preset.learning)]) {
      test(`${preset ? `${preset.name}全部教学步骤` : '列表与结果'} ${width}px`, async ({ playwright, baseURL }) => {
        test.setTimeout(180_000)
        const browser = await playwright[browserName].launch({ headless: true })
        try {
          const page = await browser.newPage({ baseURL, deviceScaleFactor: 2, reducedMotion: 'reduce' })
          await page.setViewportSize({ width, height: 901 })
          const errors: string[] = []
          page.on('pageerror', error => errors.push(error.message))
          if (!preset) {
            await page.goto('/')
            await expectIntegerLayout(page)
            await page.goto('/cases/mixed-horizontal')
            await expect(page.getByRole('radio').first()).toBeVisible()
            await expectIntegerLayout(page)
          } else {
            await page.goto(`/cases/${preset.id}/learn`)
            const slider = page.getByRole('slider', { name: '教学步骤' })
            await expect(slider).toHaveValue('0')
            await expect(slider).toHaveAttribute('max', /^[1-9][0-9]*$/)
            const last = Number(await slider.getAttribute('max'))
            for (let step = 0; step <= last; step++) {
              await test.step(`${preset.id}, step ${step}`, async () => {
                await expectIntegerLayout(page)
              })
              if (step < last) {
                await page.getByRole('button', { name: '下一步', exact: true }).evaluate(button => (button as HTMLButtonElement).click())
                await expect(slider).toHaveValue(String(step + 1))
              }
            }
          }
          expect(errors).toEqual([])
        } finally {
          await browser.close()
        }
      })
    }
  })
}
