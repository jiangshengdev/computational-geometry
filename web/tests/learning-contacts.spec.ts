import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('接触教学：共端点先记录闭集交点再完成退出与加入，可重新开始', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('combobox', { name: '预设案例' }).click()
  await page.getByRole('option', { name: '共端点', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始逐步学习' })).toBeEnabled()
  await page.getByRole('button', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const group = page.getByRole('region', { name: '同点参与线段' })
  const active = page.getByTestId('active-order')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  for (let run = 0; run < 2; run++) {
    let before = false, after = false
    while (await next.isEnabled()) {
      await next.click()
      if (!(await current.innerText()).includes('(2, 0)')) continue
      await expect(group).toContainText('开始：S1')
      await expect(group).toContainText('结束：S0')
      await expect(group).toContainText('穿过：无')
      if ((await page.getByRole('region', { name: '操作解释' }).innerText()).includes('从队首取出')) {
        await expect(active).toHaveText('S0')
        before = true
      }
      if ((await current.innerText()).includes('事件处理完成')) {
        await expect(active).toHaveText('S1')
        await expect(page.getByRole('img', { name: '交集 S0 × S1', exact: true })).toBeVisible()
        after = true
      }
    }
    expect(before && after).toBe(true)
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText('(2, 0)：S0 × S1')
    await expect(active).toHaveText('空')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(current).toContainText('尚未处理事件')
    await expect(active).toHaveText('空')
  }
})

for (const width of [1360, 390]) test(`并列教学：同横坐标不同位置分别换序 ${width}px`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/')
  await expect(page).toHaveTitle('BO 结果查看器')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await page.getByRole('combobox', { name: '预设案例' }).click()
  await page.getByRole('option', { name: '同扫描坐标不同交点', exact: true }).click()
  await page.getByRole('button', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const group = page.getByRole('region', { name: '同点参与线段' })
  const active = page.getByTestId('active-order')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(page.getByRole('region', { name: '同点与并列规则' })).toContainText('不等于所有线段共点')
  await expect(page.getByRole('link', { name: /KIT/ })).toHaveAttribute('href', /algogeom-ws15-vl02.pdf$/)
  for (let run = 0; run < 2; run++) {
    const completed: string[] = []
    while (await next.isEnabled()) {
      await next.click()
      const event = await current.innerText()
      if (event.includes('(0, -1)')) {
        await expect(group).toContainText('开始：无')
        await expect(group).toContainText('结束：无')
        await expect(group).toContainText('穿过：S0、S1')
        await expect(group).not.toContainText('S2')
        await expect(queue).toContainText('(0, 3)')
        if (event.includes('事件处理完成')) {
          await expect(active).toHaveText('S1S0S2S3')
          await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(1)
          await expect.poll(() => page.locator('.drawing text.tick').evaluateAll(labels => {
            const boxes = labels.map(label => label.getBoundingClientRect())
            return boxes.some((a, i) => boxes.slice(i + 1).some(b =>
              a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top))
          })).toBe(false)
          completed.push('(0, -1)')
          if (run === 0) await page.screenshot({ path: join(tmpdir(), `bo-contacts-${width}.png`), fullPage: true })
        }
      }
      if (event.includes('(0, 3)')) {
        await expect(group).toContainText('穿过：S2、S3')
        await expect(group).not.toContainText('S0')
        if (event.includes('事件处理完成')) {
          await expect(active).toHaveText('S1S0S3S2')
          completed.push('(0, 3)')
        }
      }
    }
    expect(completed).toEqual(['(0, -1)', '(0, 3)'])
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText('I0 (0, -1)：S0 × S1')
    await expect(result).toContainText('I1 (0, 3)：S2 × S3')
    await expect(result).toContainText('独立交点位置：2')
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(2)
    await expect(queue.getByRole('listitem')).toHaveCount(0)
    await expect(active).toHaveText('空')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(current).toContainText('尚未处理事件')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

for (const [name, starts, ends, initial, final] of [
  ['起点落在内部', 'S1', '无', 'S0', 'S0S1'],
  ['终点落在内部', '无', 'S1', 'S0S1', 'S0'],
]) test(`接触教学：${name}与穿过者归组`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('combobox', { name: '预设案例' }).click()
  await page.getByRole('option', { name, exact: true }).click()
  await page.getByRole('button', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const active = page.getByTestId('active-order')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  for (let run = 0; run < 2; run++) {
    let before = false, after = false, recorded = false
    let checkedQueuedEndpoint = false
    while (await next.isEnabled()) {
      await next.click()
      if (name === '终点落在内部' && (await explanation.innerText()).includes('检查相邻线段')) {
        await expect(page.getByRole('region', { name: '待处理事件队列' })).toContainText('(2, 0)')
        await expect(explanation).toContainText('端点事件可能已经在队列中')
        checkedQueuedEndpoint = true
      }
      if (!(await current.innerText()).includes('(2, 0)')) continue
      const group = page.getByRole('region', { name: '同点参与线段' })
      await expect(group).toContainText(`开始：${starts}`)
      await expect(group).toContainText(`结束：${ends}`)
      await expect(group).toContainText('穿过：S0')
      if ((await explanation.innerText()).includes('从队首取出')) {
        await expect(active).toHaveText(initial)
        before = true
      }
      if ((await explanation.innerText()).includes('交集已记入结果')) {
        await expect(explanation).toContainText('在这里接触')
        await expect(active).toHaveText(initial)
        recorded = true
      }
      if ((await current.innerText()).includes('事件处理完成')) {
        await expect(active).toHaveText(final)
        after = true
      }
    }
    expect(before && after && recorded).toBe(true)
    if (name === '终点落在内部') expect(checkedQueuedEndpoint).toBe(true)
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText('(2, 0)：S0 × S1')
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(1)
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(current).toContainText('尚未处理事件')
    await expect(active).toHaveText('空')
  }
})
