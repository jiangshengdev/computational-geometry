import { expect, test } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('相邻检测：删除中间线段后发现交点并可重现', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, '退出后成为邻居')
  await expect(page.getByText(/学习目标：观察中间线段退出/)).toBeHidden()
  await page.getByRole('button', { name: '案例说明', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('学习目标：观察中间线段退出')
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const active = page.getByTestId('active-order')
  const explanation = page.getByRole('region', { name: '操作解释' })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  // y=x and y=10-x meet at (5,5). S1 ends at x=3, before
  // either could meet its horizontal y=5 segment on [1,3].
  for (let run = 0; run < 2; run++) {
    let separated = false
    let checked = false
    let discovered = false
    while (await next.isEnabled()) {
      await next.click()
      const text = await explanation.getByRole('paragraph').first().innerText()
      const event = await current.locator('.coordinates:not([aria-hidden="true"])').innerText()
      if (event === 'S2 起点 (2, 8)' && (await current.innerText()).includes('处理完成')) {
        await expect(active).toHaveText('S0S1S2')
        await expect(queue).not.toContainText('I0')
        separated = true
      }
      if (text.startsWith('检查相邻线段 S0 × S2')) {
        expect(separated).toBe(true)
        await expect(current).toContainText('S1 终点 (3, 5)')
        await expect(explanation).toContainText('退出 S1 后')
        await expect(active).toHaveText('S0S2')
        await expect(queue).not.toContainText('I0')
        for (const id of [0, 2]) {
          await expect(page.getByRole('img', { name: `输入 S${id}`, exact: true })).toHaveAttribute('data-checked', 'true')
          await expect(active.getByText(`S${id}`, { exact: true })).toHaveAttribute('data-checked', 'true')
        }
        await expect(page.getByRole('img', { name: '输入 S1', exact: true })).toHaveAttribute('data-highlighted', 'false')
        checked = true
      }
      if (text.startsWith('发现未来交点 I0 (5, 5)')) {
        expect(checked).toBe(true)
        await expect(queue).toContainText('I0 (5, 5)')
        discovered = true
      }
    }
    expect(discovered).toBe(true)
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText('I0 (5, 5)：S0 × S2')
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(1)
    await expect(active).toHaveText('空')
    if (run === 0) {
      await page.getByRole('button', { name: '重新开始', exact: true }).click()
      await expect(current).toContainText('尚未处理事件')
      await expect(queue).not.toContainText('I0')
      await expect(active).toHaveText('空')
    }
  }
})

for (const width of [1360, 390]) {
  test(`相邻检测：插入和交叉后发现新邻居 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/cases/crossing')
    await expect(page).toHaveTitle('BO 结果查看器')
    await selectPreset(page, 'neighbor-crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    await expect(page.getByRole('region', { name: '为什么不会漏掉交点' })).toContainText('一般位置')
    await expect(page.getByRole('region', { name: '为什么不会漏掉交点' })).toContainText('第三条线段')
    await expect(page.getByRole('region', { name: '为什么不会漏掉交点' })).toContainText('额外规则')
    await expect(page.getByRole('link', { name: /Dave Mount/ })).toHaveAttribute('href', 'https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect04-intersection.pdf')
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const explanation = page.getByRole('region', { name: '操作解释' })
    const active = page.getByTestId('active-order')
    const current = page.getByRole('region', { name: '当前事件' })
    const queue = page.getByRole('region', { name: '待处理事件队列' })
    let inserted = false
    let separated = false
    let checked = false
    let discovered = false
    // S0: y=x, S1: y=3, S2: y=6. Independent intersections
    // are (3,3) and (6,6); the horizontal lines do not intersect.
    while (await next.isEnabled()) {
      await next.click()
      const text = await explanation.getByRole('paragraph').first().innerText()
      const event = await current.locator('.coordinates:not([aria-hidden="true"])').innerText()
      if (text.startsWith('检查相邻线段 S0 × S1')) {
        await expect(explanation).toContainText('加入 S1 后')
        await expect(queue).not.toContainText('I0')
        inserted = true
      }
      if (event === 'S2 起点 (2, 6)' && (await current.innerText()).includes('处理完成')) {
        await expect(active).toHaveText('S0S1S2')
        await expect(queue).toContainText('I0 (3, 3)')
        await expect(queue).not.toContainText('I1')
        separated = true
      }
      if (text.startsWith('检查相邻线段 S0 × S2')) {
        expect(separated).toBe(true)
        await expect(current).toContainText('I0 (3, 3)')
        await expect(explanation).toContainText(/交叉的 (S0 与 S1|S1 与 S0) 换序后/)
        await expect(active).toHaveText('S1S0S2')
        await expect(queue).not.toContainText('I1')
        const line = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
        await expect(line).toHaveCSS('stroke-width', '6px')
        await expect(active.getByText('S0', { exact: true })).toHaveCSS('outline-style', 'solid')
        await expect(page.getByRole('img', { name: '输入 S2', exact: true })).toHaveAttribute('data-checked', 'true')
        await expect(page.getByRole('img', { name: '输入 S1', exact: true })).toHaveAttribute('data-checked', 'false')
        // Capture the settled teaching state, not outgoing rows or a swap frame.
        await expect(current.locator('[aria-hidden="true"]')).toHaveCount(0)
        await expect(queue.locator('[aria-hidden="true"]')).toHaveCount(0)
        await expect.poll(() => active.getByRole('listitem').evaluateAll(rows => {
          const boxes = rows.map(row => row.getBoundingClientRect())
          return boxes.every((box, i) => i === 0 || box.bottom <= boxes[i - 1].top)
        })).toBe(true)
        await explanation.scrollIntoViewIfNeeded()
        await page.screenshot({ path: join(tmpdir(), `bo-neighbors-${width}.png`), fullPage: true })
        checked = true
      }
      if (text.startsWith('发现未来交点 I1 (6, 6)')) {
        expect(checked).toBe(true)
        await expect(queue).toContainText('I1 (6, 6)')
        await expect(page.getByRole('img', { name: '已发现 I1 (6, 6)' })).toBeVisible()
        discovered = true
      }
    }
    expect(inserted && discovered).toBe(true)
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText('I0 (3, 3)：S0 × S1')
    await expect(result).toContainText('I1 (6, 6)：S0 × S2')
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(2)
    await expect(active).toHaveText('空')
    await expect(queue.getByRole('listitem')).toHaveCount(0)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
