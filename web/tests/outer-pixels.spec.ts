import { expect, test, expandedPanels } from './learning-test'
import { expectLearningColumns } from './learning-layout'

test.describe.configure({ mode: 'parallel' })

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  test.describe(`外层像素 ${browserName}`, () => {
    for (const width of [1100, 1361, 1920]) {
      browserTest(`结果三栏与学习1:2:2三栏均保持整数布局 ${width}px`, async ({ browser, baseURL }) => {
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
          const learning = await columns(true)
          await expectLearningColumns(page)
          const code = (await page.getByRole('region', { name: '核心代码回放', exact: true }).boundingBox())!
          const variables = (await page.getByRole('region', { name: '核心变量', exact: true }).boundingBox())!
          expect(learning[0].width).toBe(learning[2].width)
          expect(code.x).toBeGreaterThan(learning[1].x + learning[1].width)
          expect(variables.x).toBeGreaterThan(code.x + code.width)
          const available = results.reduce((sum, box) => sum + box.width, 0)
          const side = Math.floor(available * 0.2)
          expect(results.map(box => box.width)).toEqual([side, available - 2 * side, side])
          for (const box of [...results, ...learning, code, variables]) {
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
  })
}
