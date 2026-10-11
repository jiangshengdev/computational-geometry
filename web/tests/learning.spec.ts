import { expect, test } from './learning-test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const step of [3, 27, 28]) {
  test(`非活动参与线段保持普通样式：普通交叉步骤 ${step}`, async ({ page }) => {
    await page.goto(`/cases/crossing/learn?step=${step}`)
    const input = page.getByRole('img', { name: '输入 S0', exact: true })
    await expect(page.getByTestId('active-order')).toHaveText('空')
    await expect(input).toHaveAttribute('data-active', 'false')
    await expect(input).toHaveAttribute('data-participant', 'true')
    await expect(input.locator('line')).toHaveCSS('stroke', 'rgb(123, 159, 207)')
    await expect(input.locator('line')).toHaveCSS('stroke-width', '2px')
    if (step === 3) {
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expect(page.getByTestId('active-order')).toHaveText('S0')
      await expect(input).toHaveAttribute('data-active', 'true')
      await expect(input.locator('line')).toHaveCSS('stroke', 'rgb(36, 92, 176)')
      await expect(input.locator('line')).toHaveCSS('stroke-width', '4px')
    }
  })
}

test('入门学习：交叉的发现、换序、退出和重新开始', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'crossing')
  await expect(page.getByText(/两两检查/).first()).toBeHidden()
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await expect(page.getByText(/两两检查/).first()).toBeVisible()
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(page.getByText(/两两检查/).first()).toBeHidden()
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const active = page.getByRole('region', { name: '活动线段顺序' })
  const current = page.getByRole('region', { name: '当前事件' })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const snapshots: string[] = []
  await expect(queue).toContainText('S0 起点 (0, 0)')
  await expect(queue).not.toContainText('I0')
  await expect(active).toContainText('空')
  await expect(page.getByRole('img', { name: /交集 S0/ })).toHaveCount(0)
  // y=x and y=4-x meet at (2,2). Endpoints are ordered by (x,y).
  const events = ['S0 起点 (0, 0)', 'S1 起点 (0, 4)', 'I0 (2, 2)', 'S1 终点 (4, 0)', 'S0 终点 (4, 4)']
  const orders = ['S0', 'S0S1', 'S1S0', 'S0', '空']
  for (let i = 0; i < events.length; i++) {
    await next.click()
    await expect(explanation).toContainText('进入取事件模块')
    await expect(queue).toContainText(events[i])
    await next.click()
    await expect(explanation).toContainText('queue.pop_first()')
    await expect(queue).not.toContainText(events[i])
    await next.click()
    await expect(current).toContainText(events[i])
    await expect(current).toContainText('处理中')
    await expect(queue).not.toContainText(events[i])
    let sawDiscovery = false
    let sawReorder = false
    do {
      await next.click()
      const text = await explanation.innerText()
      if (text.includes('发现未来交点')) {
        sawDiscovery = true
        await expect(explanation).toContainText('S0 × S1')
        await expect(queue).toContainText('I0 (2, 2)')
      }
      if (text.includes('换序为')) sawReorder = true
    } while (!(await current.innerText()).includes('处理完成'))
    await expect(current).toContainText('处理完成')
    await expect(current.locator('.coordinates')).toHaveText([events[i]])
    await expect(active.getByTestId('active-order')).toHaveText(orders[i])
    const x = i < 2 ? '0' : i === 2 ? '2' : '4'
    // A vertical SVG line has a zero-width bounding box in Playwright even
    // though its stroke is painted. Verify its position and painted stroke.
    const sweep = page.getByRole('img', { name: `扫描线 x = ${x}` })
    await expect(sweep).toHaveAttribute('x1', await sweep.getAttribute('x2') as string)
    expect(await sweep.evaluate(element => getComputedStyle(element).stroke)).not.toBe('none')
    for (const id of [0, 1]) {
      await expect(page.getByRole('img', { name: `输入 S${id}`, exact: true })).toHaveAttribute('data-active', String(orders[i].includes(`S${id}`)))
    }
    snapshots.push(await page.getByRole('region', { name: '逐步学习' }).innerText())
    if (i === 1) {
      await expect(queue).toContainText('I0 (2, 2)')
      expect(sawDiscovery).toBe(true)
      await expect(page.getByRole('img', { name: '已发现 I0 (2, 2)' })).toBeVisible()
    }
    if (i === 2) {
      expect(sawReorder).toBe(true)
      await expect(page.getByRole('img', { name: '交集 S0 × S1' })).toBeVisible()
    }
  }
  await next.click()
  await next.click()
  await next.click()
  await expect(explanation).toContainText('next 为 None')
  await expect(page.getByRole('region', { name: '学习结果' })).toContainText('I0 (2, 2)：S0 × S1')
  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(active.getByTestId('active-order')).toHaveText('空')
  await expect(queue).not.toContainText('I0')
  await expect(page.getByRole('img', { name: /交集 S0/ })).toHaveCount(0)
  await expect(next).toBeEnabled()
  for (const snapshot of snapshots) {
    await next.click()
    await next.click()
    await next.click()
    do { await next.click() } while (!(await current.innerText()).includes('处理完成'))
    await expect.poll(() => page.getByRole('region', { name: '逐步学习' }).innerText()).toBe(snapshot)
  }
})

test('入门学习：无交点完整流程与切换隔离', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'disjoint')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const active = page.getByTestId('active-order')
  const events = ['S0 起点 (0, 0)', 'S1 起点 (0, 2)', 'S0 终点 (4, 0)', 'S1 终点 (4, 2)']
  const orders = ['S0', 'S0S1', 'S1', '空']
  for (let i = 0; i < events.length; i++) {
    await next.click()
    await next.click()
    await next.click()
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText(events[i])
    await expect(queue).not.toContainText(events[i])
    do { await next.click() } while (!(await page.getByRole('region', { name: '当前事件' }).innerText()).includes('处理完成'))
    await expect(active).toHaveText(orders[i])
    await expect(queue).not.toContainText('I0')
    await expect(page.getByRole('img', { name: /交集 S/ })).toHaveCount(0)
    if (i === 1) await expect(page.getByRole('region', { name: '操作解释' })).toContainText('没有需要加入队列的未来交点')
  }
  await next.click()
  await next.click()
  await next.click()
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('next 为 None')
  await expect(page.getByRole('region', { name: '学习结果' })).toContainText('结果为空')
  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(active).toHaveText('空')
  await expect(queue.locator('li')).toHaveText(events)
  await selectPreset(page, 'crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(queue).toContainText('S1 起点 (0, 4)')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
})

test('入门学习：桌面与手机的图形、队列、操作解释同步且无页面错误', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  for (const viewport of [{ width: 1360, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/cases/crossing')
    await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    do {
      await page.getByRole('button', { name: '下一步', exact: true }).click()
    } while (!(await page.getByRole('region', { name: '操作解释' }).innerText()).includes('发现未来交点'))
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('发现未来交点 I0 (2, 2)')
    const diagram = page.getByRole('region', { name: '几何视图' })
    const crossing = page.getByRole('img', { name: '已发现 I0 (2, 2)' }).locator('circle')
    const start = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
    const [cx, cy, x1, y1, x2, y2] = await Promise.all([
      crossing.getAttribute('cx'), crossing.getAttribute('cy'), start.getAttribute('x1'), start.getAttribute('y1'), start.getAttribute('x2'), start.getAttribute('y2'),
    ])
    expect(Number(cx)).toBeCloseTo((Number(x1) + Number(x2)) / 2)
    expect(Number(cy)).toBeCloseTo((Number(y1) + Number(y2)) / 2)
    await crossing.scrollIntoViewIfNeeded()
    const target = (await crossing.boundingBox())!
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
    await expect(diagram.getByRole('status', { name: '画布对象详情' })).toHaveText('I0 (2, 2)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: join(tmpdir(), `bo-learning-${viewport.width}.png`), fullPage: true })
  }
  expect(errors).toEqual([])
})
