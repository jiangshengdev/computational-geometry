import { expect, test, type Page } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function startLearning(page: Page) {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
}

test('状态动画：活动线段换序与反向恢复，几何线段不移动', async ({ page }) => {
  await startLearning(page)
  await jumpTo(page, 10)
  const line = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
  const geometry = await line.boundingBox()
  const forward = await sampleStep(page, 'S0', '下一步')
  const start = forward[0][0].y
  const end = forward.at(-1)![0].y
  expect(start - end).toBeGreaterThan(10)
  expect(forward.some(rows => rows.some(row => row.y > end + 1 && row.y < start - 1))).toBe(true)
  expect(forward.every(rows => rows.length === 1 && rows[0].opacity === 1)).toBe(true)
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
  expect(await line.boundingBox()).toEqual(geometry)
  const backward = await sampleStep(page, 'S0', '上一步')
  expect(backward.at(-1)![0].y).toBeCloseTo(start, 0)
  expect(backward.some(rows => rows.some(row => row.y > end + 1 && row.y < start - 1))).toBe(true)
  await expect(page.getByTestId('active-order')).toHaveText('S0S1')
})

async function jumpTo(page: Page, step: number) {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await page.keyboard.press('Home')
  for (let index = 0; index < step; index++) await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuenow', String(step))
  await slider.blur()
}

// Observe painted rows, including any outgoing row, through the browser boundary.
type NavigationAction = '下一步' | '上一步' | '重新开始' | 'Home' | 'End'

async function sampleStep(page: Page, text: string, direction: NavigationAction | NavigationAction[]) {
  return page.evaluate(async ({ text, direction }) => {
    const samples: { x: number; right: number; y: number; opacity: number; unclipped: boolean }[][] = []
    const read = () => [...document.querySelectorAll<HTMLElement>('aside li, aside p, [data-learning-event-transfer]')]
      .filter(element => element.textContent === text)
      .filter(element => getComputedStyle(element).visibility !== 'hidden')
      .map(element => {
        const { x, right, y, height } = element.getBoundingClientRect()
        const centerX = (x + right) / 2, centerY = y + height / 2
        let unclipped = centerX >= 0 && centerX <= innerWidth && centerY >= 0 && centerY <= innerHeight
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect()
          if (style.overflowX !== 'visible' && (centerX < rect.left || centerX > rect.right)) unclipped = false
          if (style.overflowY !== 'visible' && (centerY < rect.top || centerY > rect.bottom)) unclipped = false
        }
        return { x, right, y, opacity: Number(getComputedStyle(element).opacity), unclipped }
      })
      .filter(row => row.opacity > 0.01)
    samples.push(read())
    const actions = Array.isArray(direction) ? direction : [direction]
    const act = (action: typeof actions[number]) => {
      if (action === 'Home' || action === 'End') {
        const slider = document.querySelector<HTMLElement>('[role="slider"]')!
        slider.focus()
        slider.dispatchEvent(new KeyboardEvent('keydown', { key: action, bubbles: true }))
      } else {
        const button = [...document.querySelectorAll('button')].find(element => element.textContent?.startsWith(action))!
        button.click()
      }
    }
    act(actions[0])
    for (let frame = 0; frame < 45; frame++) {
      await new Promise(requestAnimationFrame)
      samples.push(read())
      if (frame > 0 && frame % 2 === 0 && actions[frame / 2]) act(actions[frame / 2])
    }
    return samples
  }, { text, direction })
}

test('状态动画：队列及活动线段的剩余条目连续补位', async ({ page }) => {
  await startLearning(page)
  const queue = await sampleStep(page, 'S1 起点 (0, 4)', '下一步')
  const queueStart = queue[0][0].y
  const queueEnd = queue.at(-1)![0].y
  expect(queueStart - queueEnd).toBeGreaterThan(10)
  expect(queue.some(rows => rows.some(row => row.y > queueEnd + 1 && row.y < queueStart - 1))).toBe(true)
  await jumpTo(page, 4)
  const active = await sampleStep(page, 'S0', '下一步')
  const activeStart = active[0][0].y
  const activeEnd = active.at(-1)![0].y
  // Adding S1 above S0 moves the existing row down in the reverse-flow list.
  expect(Math.abs(activeStart - activeEnd)).toBeGreaterThan(10)
  const lower = Math.min(activeStart, activeEnd)
  const upper = Math.max(activeStart, activeEnd)
  expect(active.some(rows => rows.some(row => row.y > lower + 1 && row.y < upper - 1))).toBe(true)
})

test('状态动画：跳转无中间移动，中断后不残留旧目标', async ({ page }) => {
  await startLearning(page)
  await jumpTo(page, 11)
  const direct = await sampleStep(page, 'S0 起点 (0, 0)', 'Home')
  const destination = direct.at(-1)![0].y
  expect(direct.slice(1).every(rows => rows.length === 1 && rows[0].y === destination && rows[0].opacity === 1)).toBe(true)
  const restart = await sampleStep(page, 'S0 起点 (0, 0)', ['下一步', '重新开始'])
  expect(restart.slice(5).every(rows => rows.length === 1 && rows[0].y === destination && rows[0].opacity === 1)).toBe(true)
  const interrupted = await sampleStep(page, 'S0 起点 (0, 0)', ['下一步', '上一步', '下一步'])
  const final = interrupted.at(-1)![0]
  expect(Math.hypot(final.x - direct.at(-1)![0].x, final.y - destination)).toBeGreaterThan(30)
  expect(interrupted.every(rows => rows.length === 1 && rows[0].opacity > 0.95)).toBe(true)
  expect(interrupted.slice(-5).every(rows => Math.abs(rows[0].y - final.y) < 1)).toBe(true)
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('S0 起点 (0, 0)')
  await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('S0 起点 (0, 0)')
})

test('状态动画：队首事件整行转移并能反向返回', async ({ page }) => {
  await startLearning(page)
  const text = 'S0 起点 (0, 0)'
  const forward = await sampleStep(page, text, '下一步')
  const start = forward[0][0].y
  const end = forward.at(-1)![0].y
  expect(Math.hypot(forward[0][0].x - forward.at(-1)![0].x, start - end)).toBeGreaterThan(30)
  const lower = Math.min(start, end), upper = Math.max(start, end)
  expect(forward.some(rows => rows.some(row => row.y > lower + 2 && row.y < upper - 2))).toBe(true)
  expect(forward.some(rows => rows.some(row => row.x > Math.min(forward[0][0].x, forward.at(-1)![0].x) + 30
    && row.x < Math.max(forward[0][0].x, forward.at(-1)![0].x) - 30 && row.unclipped))).toBe(true)
  expect(forward.every(rows => rows.length === 1 && rows[0].opacity > 0.95)).toBe(true)
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText(text)
  await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText(text)

  const backward = await sampleStep(page, text, '上一步')
  expect(backward.at(-1)![0].y).toBeCloseTo(start, 0)
  expect(backward.some(rows => rows.some(row => row.y > lower + 2 && row.y < upper - 2))).toBe(true)
  expect(backward.some(rows => rows.some(row => row.x > Math.min(backward[0][0].x, backward.at(-1)![0].x) + 30
    && row.x < Math.max(backward[0][0].x, backward.at(-1)![0].x) - 30 && row.unclipped))).toBe(true)
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
  await page.getByRole('link', { name: '开始逐步学习' }).click()
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
  const lower = Math.min(start, end), upper = Math.max(start, end)
  expect(samples.some(rows => rows.some(row => row.y > lower + 2 && row.y < upper - 2))).toBe(true)
  expect(samples.every(rows => rows.every(row => row.x >= 0 && row.right <= width))).toBe(true)
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

test('状态动画：活动线段进入、退出与反向插入', async ({ page }) => {
  await startLearning(page)
  await jumpTo(page, 1)
  const enter = await sampleStep(page, 'S0', '下一步')
  expect(enter[0]).toHaveLength(0)
  expect(enter.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  const empty = await sampleStep(page, 'S0', '上一步')
  expect(empty.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(empty.at(-1)).toHaveLength(0)
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, 13)
  const exit = await sampleStep(page, 'S1', '下一步')
  expect(exit.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(exit.at(-1)).toHaveLength(0)
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  const restore = await sampleStep(page, 'S1', '上一步')
  expect(restore.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
})

for (const width of [1360, 390]) {
test(`状态动画：换序中断与跳转隔离 ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 })
  await startLearning(page)
  await jumpTo(page, 10)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '11')
  const order = page.getByTestId('active-order')
  await expect(order).toHaveText('S1S0')
  const backwards = await sampleStep(page, 'S0', '上一步')
  expect(backwards.at(-1)![0].opacity).toBe(1)
  expect(backwards.every(rows => rows.every(row => row.x >= 0 && row.right <= width))).toBe(true)
  await order.getByText('S0', { exact: true }).hover()
  await expect(page.getByRole('img', { name: '输入 S0', exact: true })).toHaveAttribute('data-highlighted', 'true')
  await page.screenshot({ path: join(tmpdir(), `bo-active-motion-${width}.png`), fullPage: true })
  await page.keyboard.press('ArrowRight')
  await jumpTo(page, 0)
  await expect(order).toHaveText('空')
  await expect(page.locator('aside li')).toHaveCount(4)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await jumpTo(page, 10)
  const reduced = await sampleStep(page, 'S0', '下一步')
  const destination = reduced.at(-1)![0].y
  expect(reduced.slice(1).every(rows => rows.length === 1 && Math.abs(rows[0].y - destination) < 1)).toBe(true)
})
}
