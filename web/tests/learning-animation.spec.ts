import { expect, test, type Page } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function startLearning(page: Page) {
  await page.goto('/')
  await selectPreset(page, 'crossing')
  await page.getByRole('button', { name: '开始逐步学习' }).click()
}

async function jumpTo(page: Page, step: number) {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await page.keyboard.press('Home')
  for (let index = 0; index < step; index++) await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuenow', String(step))
  await slider.blur()
}

// Observe painted rows, including any outgoing row, through the browser boundary.
async function sampleStep(page: Page, text: string, direction: '下一步' | '上一步') {
  return page.evaluate(async ({ text, direction }) => {
    const samples: { y: number; opacity: number }[][] = []
    const read = () => [...document.querySelectorAll<HTMLElement>('aside li, aside p')]
      .filter(element => element.textContent === text)
      .filter(element => getComputedStyle(element).visibility !== 'hidden')
      .map(element => ({ y: element.getBoundingClientRect().y, opacity: Number(getComputedStyle(element).opacity) }))
      .filter(row => row.opacity > 0.01)
    samples.push(read())
    const button = [...document.querySelectorAll('button')].find(element => element.textContent?.startsWith(direction))!
    button.click()
    for (let frame = 0; frame < 45; frame++) {
      await new Promise(requestAnimationFrame)
      samples.push(read())
    }
    return samples
  }, { text, direction })
}

test('状态动画：队首事件整行转移并能反向返回', async ({ page }) => {
  await startLearning(page)
  const text = 'S0 起点 (0, 0)'
  const forward = await sampleStep(page, text, '下一步')
  const start = forward[0][0].y
  const end = forward.at(-1)![0].y
  expect(start - end).toBeGreaterThan(30)
  expect(forward.some(rows => rows.some(row => row.y > end + 2 && row.y < start - 2))).toBe(true)
  expect(forward.every(rows => rows.length === 1 && rows[0].opacity > 0.95)).toBe(true)
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText(text)
  await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText(text)

  const backward = await sampleStep(page, text, '上一步')
  expect(backward.at(-1)![0].y).toBeCloseTo(start, 0)
  expect(backward.some(rows => rows.some(row => row.y > end + 2 && row.y < start - 2))).toBe(true)
  expect(backward.every(rows => rows.length === 1 && rows[0].opacity > 0.95)).toBe(true)
})

test('状态动画：事件新增和无目标退出具有可见过渡', async ({ page }) => {
  await startLearning(page)
  await jumpTo(page, 6)
  const enter = await sampleStep(page, 'I0 (2, 2)', '下一步')
  expect(enter[0]).toHaveLength(0)
  expect(enter.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(enter.at(-1)).toHaveLength(1)
  const exit = await sampleStep(page, 'I0 (2, 2)', '上一步')
  expect(exit.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(exit.at(-1)).toHaveLength(0)

  await jumpTo(page, 3)
  const replaced = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  expect(replaced.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(replaced.at(-1)).toHaveLength(0)
})

test('状态动画：快速反向、进度跳转和重启立即采用最新步骤', async ({ page }) => {
  await startLearning(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '1')
  const current = page.getByRole('region', { name: '当前事件' })
  await expect(current).toContainText('S0 起点 (0, 0)')
  await jumpTo(page, 8)
  await expect(current).toContainText('S1 起点 (0, 4)')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('r')
  await expect(current).toContainText('尚未处理事件')
  await expect(page.locator('aside li')).toHaveCount(4)
  await page.keyboard.press('ArrowRight')
  await selectPreset(page, 'disjoint')
  await page.getByRole('button', { name: '开始逐步学习' }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
})

for (const width of [1360, 390]) {
test(`状态动画：事件移动与减少动态效果 ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await startLearning(page)
  const samples = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  const start = samples[0][0].y
  const end = samples.at(-1)![0].y
  expect(samples.some(rows => rows.some(row => row.y > end + 2 && row.y < start - 2))).toBe(true)
  await page.screenshot({ path: join(tmpdir(), `bo-event-motion-${width}.png`), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await jumpTo(page, 0)
  const reduced = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  const destination = reduced.at(-1)![0].y
  expect(reduced.slice(1).every(rows => rows.length === 1 && Math.abs(rows[0].y - destination) < 1 && rows[0].opacity === 1)).toBe(true)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})
}
