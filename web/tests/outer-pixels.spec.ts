import { expect, test, type Page } from '@playwright/test'
import { presets } from '../src/presets'
import { setReadingFont } from './reading-font'

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
    for (const width of [391, 1361]) {
      test(`列表、结果和全部教学步骤 ${width}px`, async ({ playwright, baseURL }) => {
        test.setTimeout(180_000)
        const browser = await playwright[browserName].launch({ headless: true })
        try {
          const page = await browser.newPage({ baseURL, deviceScaleFactor: 2, reducedMotion: 'reduce' })
          await page.setViewportSize({ width, height: 901 })
          const errors: string[] = []
          page.on('pageerror', error => errors.push(error.message))
          for (const fontSize of [16, 20, 24]) {
            await page.goto('/')
            await setReadingFont(page, fontSize)
            await expectIntegerLayout(page)
            await page.goto('/cases/mixed-horizontal')
            await expect(page.getByRole('radio').first()).toBeVisible()
            await setReadingFont(page, fontSize)
            await expectIntegerLayout(page)
            for (const preset of presets.filter(preset => preset.learning)) {
              await page.goto(`/cases/${preset.id}/learn`)
              const slider = page.getByRole('slider', { name: '教学步骤' })
              await expect(slider).toHaveValue('0')
              await setReadingFont(page, fontSize)
              await expect(slider).toHaveAttribute('max', /^[1-9][0-9]*$/)
              const last = Number(await slider.getAttribute('max'))
              for (let step = 0; step <= last; step++) {
                await test.step(`${preset.id}, font ${fontSize}, step ${step}`, async () => {
                  await expectIntegerLayout(page)
                })
                if (step < last) {
                  await page.getByRole('button', { name: '下一步', exact: true }).evaluate(button => (button as HTMLButtonElement).click())
                  await expect(slider).toHaveValue(String(step + 1))
                }
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
