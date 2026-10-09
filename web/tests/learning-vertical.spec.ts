import { expect, test } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('竖直教学：多高度交叉、顶端接触及重启保持原坐标顺序', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/cases/crossing')
  await selectPreset(page, '竖直线多高度接触')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const group = page.getByRole('region', { name: '同点参与线段' })
  const active = page.getByTestId('active-order')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  for (let run = 0; run < 2; run++) {
    const completed: string[] = []
    while (await next.isEnabled()) {
      await next.click()
      const event = await current.innerText()
      for (const [point, passes, starts, ends, order] of [
        ['(0, -1)', 'S0、S1', '无', '无', 'S1S0S2'],
        ['(0, 1)', 'S0、S2', '无', '无', 'S1S2S0'],
        ['(0, 3)', '无', 'S3', 'S0', 'S1S2S3'],
      ]) {
        if (!event.includes(point)) continue
        // Membership may follow status order; inspect identities independently.
        for (const id of passes === '无' ? [] : passes.split('、')) {
          await expect(group.getByText(/^穿过：/)).toContainText(id)
        }
        await expect(group).toContainText(`开始：${starts}`)
        await expect(group).toContainText(`结束：${ends}`)
        // A stroked vertical SVG line has a zero-width bounding box.
        const scan = page.getByRole('img', { name: '扫描线 x = 0', exact: true })
        await expect(scan).toHaveCSS('visibility', 'visible')
        await expect(scan).not.toHaveCSS('stroke', 'none')
        await expect(scan).not.toHaveCSS('stroke-width', '0px')
        if (event.includes('事件处理完成')) {
          completed.push(point)
          await expect(active).toHaveText(order)
          await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(completed.length)
        }
      }
    }
    expect(completed).toEqual(['(0, -1)', '(0, 1)', '(0, 3)'])
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText('(0, -1)：S0 × S1')
    await expect(result).toContainText('(0, 1)：S0 × S2')
    await expect(result).toContainText('(0, 3)：S0 × S3')
    await expect(result).toContainText('独立交点位置：3；相交线段对：3')
    await expect(active).toHaveText('空')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(current).toContainText('尚未处理事件')
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(0)
  }
})

for (const width of [1360, 390]) test(`竖直教学：状态标记表示处理高度 ${width}px`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/cases/crossing')
  await expect(page).toHaveTitle('BO 结果查看器')
  await selectPreset(page, '竖直线多高度接触')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await page.getByRole('tab', { name: '竖直线处理规则', exact: true }).click()
  const rule = page.getByRole('region', { name: '竖直线处理规则' })
  await expect(rule).toContainText('重合为一段')
  await expect(rule).toContainText('处理高度')
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  while (await next.isEnabled()) {
    await next.click()
    if ((await current.innerText()).includes('(0, -1)') && (await current.innerText()).includes('事件处理完成')) break
  }
  await expect(current).toContainText('(0, -1)')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(queue).toContainText('(0, 1)')
  await expect(queue).toContainText('(0, 3)')
  await page.getByRole('heading', { name: '活动线段顺序', exact: true }).hover()
  const marker = page.getByRole('img', { name: '活动线段 2：S0（当前处理高度）', exact: true })
  await expect(marker).toBeVisible()
  const currentDot = page.locator('.current-point')
  expect(Number(await marker.locator('circle').getAttribute('cx'))).toBeCloseTo(Number(await currentDot.getAttribute('cx')))
  expect(Number(await marker.locator('circle').getAttribute('cy'))).toBeCloseTo(Number(await currentDot.getAttribute('cy')))
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: join(tmpdir(), `bo-vertical-${width}.png`), fullPage: true })
  expect(errors).toEqual([])
})
