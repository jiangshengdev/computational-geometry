import { expect, test } from '@playwright/test'

test('蜘蛛网 hover：连续移动和切换高亮不重复排布标签', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 })
  await page.goto('/cases/spider-web/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const positions = await page.locator('.drawing .input line').evaluateAll(lines => [0, 2].map(index => {
    const line = lines[index] as SVGLineElement
    const x = (line.x1.baseVal.value + line.x2.baseVal.value) / 2
    const y = (line.y1.baseVal.value + line.y2.baseVal.value) / 2
    const point = new DOMPoint(x, y).matrixTransform(line.getScreenCTM()!)
    return { x: point.x, y: point.y }
  }))
  const report = await page.evaluateHandle(() => {
    const report = { transforms: 0, frames: [] as number[], running: true }
    const observer = new MutationObserver(records => {
      report.transforms += records.filter(record => (record.target as Element).tagName === 'text').length
    })
    observer.observe(document.querySelector('.drawing svg')!, { subtree: true, attributes: true, attributeFilter: ['transform'] })
    let previous: number | undefined
    const frame = (time: number) => {
      if (previous !== undefined) report.frames.push(time - previous)
      previous = time
      if (report.running) requestAnimationFrame(frame)
      else observer.disconnect()
    }
    requestAnimationFrame(frame)
    return report
  })
  for (let i = 0; i < 24; i++) {
    const target = Math.floor(i / 4) % 2
    await page.mouse.move(positions[target].x + i % 2, positions[target].y)
    await expect(page.getByRole('img', { name: `输入 S${target * 2}`, exact: true })).toHaveAttribute('data-highlighted', 'true')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  }
  // Point highlighting changes font weight as well as color.
  const label = page.locator('.drawing .input text[data-event-point="(-24, 0)"]').first()
  await page.getByRole('region', { name: '待处理事件队列' }).getByRole('listitem').first().hover()
  await expect(label).toHaveCSS('font-weight', '700')
  await page.getByRole('heading', { name: 'BO 结果查看器' }).hover()
  await expect(label).not.toHaveCSS('font-weight', '700')
  const measured = await report.evaluate(report => { report.running = false; return report })
  measured.frames.sort((a, b) => a - b)
  console.log(JSON.stringify({ frameP95: measured.frames[Math.ceil(measured.frames.length * 0.95) - 1], labelTransforms: measured.transforms }))
  expect(measured.transforms, 'hover must not reset and relocate every label').toBe(0)
  expect(errors).toEqual([])
})
