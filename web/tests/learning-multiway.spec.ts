import { expect, test } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cases = [
  {
    name: '三线内部共点', slug: 'interior', starts: '无', ends: '无', passes: [0, 1, 2],
    inputs: [0, 1, 2], before: 'S0S2S1', after: 'S1S2S0',
    pairs: ['S0 × S1', 'S0 × S2', 'S1 × S2'],
    pending: ['S1 终点 (2, -2)', 'S2 终点 (2, 0)', 'S0 终点 (2, 2)'],
  },
  {
    name: '端点与交叉同点', slug: 'mixed', starts: 'S3', ends: 'S2', passes: [0, 1],
    inputs: [0, 1, 2, 3], before: 'S2S0S1', after: 'S1S3S0',
    pairs: ['S0 × S1', 'S0 × S2', 'S0 × S3', 'S1 × S2', 'S1 × S3', 'S2 × S3'],
    pending: ['S3 终点 (2, 1)', 'S1 终点 (3, -3)', 'S0 终点 (3, 3)'],
  },
]

for (const example of cases) for (const width of [1360, 390]) test(`共点教学：${example.name} ${width}px`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/cases/crossing')
  await expect(page).toHaveURL('/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await selectPreset(page, example.name)
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const group = page.getByRole('region', { name: '同点参与线段' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const active = page.getByTestId('active-order')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const states: string[] = []
  // Interior: y=x, y=-x, y=0. Mixed: y=x and y=-x pass through
  // the origin, y=2x ends there, y=x/2 starts there. Distinct slopes
  // give exactly one common point, with three or six input pairs.
  for (let run = 0; run < 2; run++) {
    let before = false, after = false, records = 0, index = 0, removed = false, inserted = false
    while (await next.isEnabled()) {
      await next.click()
      const event = await current.innerText()
      const text = await explanation.innerText()
      if (event.includes('(0, 0)')) {
        await expect(queue).not.toContainText('(0, 0)')
        await expect(group).toContainText(`开始：${example.starts}`)
        await expect(group).toContainText(`结束：${example.ends}`)
        await expect(group.getByText(/^穿过：/).locator('.learning-hover-item')).toHaveCount(example.passes.length)
        for (const id of example.passes) await expect(group.getByText(/^穿过：/)).toContainText(`S${id}`)
        for (const id of example.inputs) {
          await expect(group.getByText(`S${id}`, { exact: true })).toBeVisible()
          const line = page.getByRole('img', { name: `输入 S${id}`, exact: true }).locator('line')
          await expect(line).toHaveCSS('visibility', 'visible')
          await expect(line).not.toHaveCSS('stroke', 'none')
          await expect(line).not.toHaveCSS('stroke-width', '0px')
          const box = (await line.boundingBox())!
          expect(box.width + box.height).toBeGreaterThan(0)
        }
        if (text.includes('从队首取出')) {
          await expect(active).toHaveText(example.before)
          before = true
        }
        if (text.includes('交集已记入结果')) {
          await expect(current).toContainText('事件处理中')
          await expect(active).toHaveText(example.before)
          await expect(explanation).toContainText('同一个几何点')
          if (example.slug === 'mixed' && /S0 × S1|S1 × S0/.test(text)) await expect(explanation).toContainText('在这里交叉')
          records++
        }
        if (example.slug === 'mixed' && text.includes('退出 S2：')) {
          await expect(current).toContainText('事件处理中')
          await expect(active).toHaveText('S0S1')
          await expect(explanation).toContainText('退出 S2')
          removed = true
        }
        if (example.slug === 'mixed' && text.includes('加入 S3：')) {
          await expect(current).toContainText('事件处理中')
          await expect(active).toHaveText(example.after)
          await expect(explanation).toContainText('开始者与穿过者')
          inserted = true
        }
        if (!event.includes('事件处理完成')) await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
        if (event.includes('事件处理完成')) {
          await expect(active).toHaveText(example.after)
          await expect(queue.getByRole('listitem')).toHaveText(example.pending)
          const label = page.locator('.teaching-labels [data-event-point="(0, 0)"]')
          await expect(label).toHaveCount(0)
          await expect(page.getByRole('img', { name: /^当前事件 / })).toBeVisible()
          for (const id of example.inputs) {
            await expect(page.getByRole('img', { name: `输入 S${id}`, exact: true })).toHaveAttribute('data-active', String(example.after.includes(`S${id}`)))
          }
          after = true
          if (!run) await page.screenshot({ path: join(tmpdir(), `bo-multiway-${example.slug}-${width}.png`), fullPage: true })
        }
      }
      // Hover details depend on the pointer, not the deterministic teaching trace.
      const state = JSON.stringify({
        panels: await page.locator('.learning-panel, [aria-label="学习结果"]').allInnerTexts(),
        current: await page.locator('.current-point').evaluateAll(points => points.map(point =>
          [point.getAttribute('cx'), point.getAttribute('cy')])),
        geometry: await page.locator('.drawing .input').evaluateAll(inputs => inputs.map(input =>
          ['data-active', 'data-checked', 'data-participant'].map(name => input.getAttribute(name)))),
      })
      if (!run) states.push(state)
      else expect(state).toBe(states[index])
      index++
    }
    expect(before && after).toBe(true)
    if (example.slug === 'mixed') expect(removed && inserted).toBe(true)
    expect(records).toBe(example.pairs.length)
    expect(index).toBe(states.length)
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText(`独立交点位置：1；相交线段对：${example.pairs.length}`)
    await expect(result.getByText(/\(0, 0\)：/)).toHaveCount(1)
    for (const pair of example.pairs) await expect(result).toContainText(pair)
    const markers = page.getByRole('img', { name: /^交集 / }).locator('circle')
    await expect(markers).toHaveCount(example.pairs.length)
    const positions = await markers.evaluateAll(circles => circles.map(circle => [circle.getAttribute('cx'), circle.getAttribute('cy')]))
    expect(new Set(positions.map(position => position.join(','))).size).toBe(1)
    if (!run) await result.screenshot({ path: join(tmpdir(), `bo-multiway-${example.slug}-result-${width}.png`) })
    await expect(queue.getByRole('listitem')).toHaveCount(0)
    await expect(active).toHaveText('空')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(current).toContainText('尚未处理事件')
    await expect(active).toHaveText('空')
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
    await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(0)
  }
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
