import { expect, test, type Page } from './learning-test'
import { selectPreset } from './cases'
import { readTrace, seekStep, stepIndex } from './trace-navigation'

async function startLearning(page: Page) {
  await page.goto('/cases/crossing/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  return readTrace(page, 'crossing')
}

test('状态动画：换序块暂离与重插可反向恢复，几何线段不移动', async ({ page }) => {
  const trace = await startLearning(page)
  const reorder = stepIndex(trace, step => step.action === 'reorder')
  const removal = stepIndex(trace, step => step.execution.module === 'activity' && step.execution.boundary === 2 && step.current?.x.numerator === '2')
  await jumpTo(page, removal - 1)
  const line = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
  const geometry = await line.boundingBox()
  const removed = await sampleStep(page, 'S0', '下一步')
  expect(removed[0]).toHaveLength(1)
  expect(removed.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(removed.at(-1)).toHaveLength(0)
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, reorder - 1)
  const forward = await sampleStep(page, 'S0', '下一步')
  expect(forward[0]).toHaveLength(0)
  expect(forward.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(forward.at(-1)![0].opacity).toBe(1)
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
  expect(await line.boundingBox()).toEqual(geometry)
  const backward = await sampleStep(page, 'S0', '上一步')
  expect(backward.at(-1)).toHaveLength(0)
  await jumpTo(page, removal)
  const restored = await sampleStep(page, 'S0', '上一步')
  expect(restored.at(-1)![0].y).toBeCloseTo(removed[0][0].y, 0)
  await expect(page.getByTestId('active-order')).toHaveText('S0S1')
})

async function jumpTo(page: Page, step: number) {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await seekStep(page, step)
  await expect(slider).toHaveValue(String(step))
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
        const slider = document.querySelector<HTMLInputElement>('input[type="range"]')!
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
  const trace = await startLearning(page)
  await jumpTo(page, 1)
  const queue = await sampleStep(page, 'S1 起点 (0, 4)', '下一步')
  const queueStart = queue[0][0].y
  const queueEnd = queue.at(-1)![0].y
  expect(queueStart - queueEnd).toBeGreaterThan(10)
  expect(queue.some(rows => rows.some(row => row.y > queueEnd + 1 && row.y < queueStart - 1))).toBe(true)
  await jumpTo(page, stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(1)) - 1)
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
  const trace = await startLearning(page)
  await jumpTo(page, stepIndex(trace, step => step.action === 'reorder'))
  const direct = await sampleStep(page, 'S0 起点 (0, 0)', 'Home')
  const destination = direct.at(-1)![0].y
  expect(direct.slice(1).every(rows => rows.length === 1 && rows[0].y === destination && rows[0].opacity === 1)).toBe(true)
  await jumpTo(page, 1)
  const restart = await sampleStep(page, 'S0 起点 (0, 0)', ['下一步', '重新开始'])
  expect(restart.slice(5).every(rows => rows.length === 1 && rows[0].y === destination && rows[0].opacity === 1)).toBe(true)
  await jumpTo(page, 2)
  const interrupted = await sampleStep(page, 'S0 起点 (0, 0)', ['下一步', '上一步', '下一步'])
  const final = interrupted.at(-1)![0]
  expect(Math.hypot(final.x - direct.at(-1)![0].x, final.y - destination)).toBeGreaterThan(30)
  expect(interrupted.every(rows => rows.length <= 1)).toBe(true)
  expect(interrupted.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(final.opacity).toBe(1)
  expect(interrupted.slice(-5).every(rows => Math.abs(rows[0].y - final.y) < 1)).toBe(true)
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('S0 起点 (0, 0)')
  await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('S0 起点 (0, 0)')
})

test('状态动画：取出队首与绑定当前事件分别过渡并能逐步恢复', async ({ page }) => {
  await startLearning(page)
  const text = 'S0 起点 (0, 0)'
  const current = page.getByRole('region', { name: '当前事件' })
  const pending = page.getByRole('region', { name: '待处理事件队列' })
  await jumpTo(page, 1)
  const pop = await sampleStep(page, text, '下一步')
  const origin = pop[0][0]
  expect(pop.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(pop.at(-1)).toHaveLength(0)
  await expect(current).toContainText('尚未处理事件')
  await expect(pending).not.toContainText(text)
  await expect(page.getByTestId('variable-next')).toContainText('Some')
  const bind = await sampleStep(page, text, '下一步')
  expect(bind[0]).toHaveLength(0)
  expect(bind.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(bind.at(-1)).toHaveLength(1)
  expect(bind.at(-1)![0].opacity).toBe(1)
  await expect(current).toContainText(text)
  await expect(pending).not.toContainText(text)
  const unbind = await sampleStep(page, text, '上一步')
  expect(unbind.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(unbind.at(-1)).toHaveLength(0)
  await expect(current).toContainText('尚未处理事件')
  await expect(pending).not.toContainText(text)
  const restore = await sampleStep(page, text, '上一步')
  expect(restore.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(restore.at(-1)).toHaveLength(1)
  expect(restore.at(-1)![0].y).toBeCloseTo(origin.y, 0)
  expect(restore.at(-1)![0].opacity).toBe(1)
  await expect(pending).toContainText(text)
  await expect(page.getByTestId('variable-next')).toContainText('未赋值')
})

test('状态动画：事件新增和无目标退出具有可见过渡', async ({ page }) => {
  const trace = await startLearning(page)
  await jumpTo(page, stepIndex(trace, step => step.action === 'discover') - 1)
  const enter = await sampleStep(page, 'I0 (2, 2)', '下一步')
  expect(enter[0]).toHaveLength(0)
  expect(enter.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(enter.at(-1)).toHaveLength(1)
  const exit = await sampleStep(page, 'I0 (2, 2)', '上一步')
  expect(exit.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(exit.at(-1)).toHaveLength(0)

  await jumpTo(page, stepIndex(trace, step => step.action === 'take' && step.current?.y.numerator === '4') - 1)
  const replaced = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  expect(replaced.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(replaced.at(-1)).toHaveLength(0)
})

test('状态动画：快速反向、进度跳转和重启立即采用最新步骤', async ({ page }) => {
  const trace = await startLearning(page)
  await jumpTo(page, 2)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('3')
  const current = page.getByRole('region', { name: '当前事件' })
  await expect(current).toContainText('S0 起点 (0, 0)')
  await jumpTo(page, stepIndex(trace, step => step.action === 'complete' && step.current?.y.numerator === '4' && step.current.x.numerator === '0'))
  await expect(current).toContainText('S1 起点 (0, 4)')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('r')
  await expect(current).toContainText('尚未处理事件')
  await expect(page.locator('aside li')).toHaveCount(4)
  await page.keyboard.press('ArrowRight')
  await selectPreset(page, 'disjoint')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
})

for (const width of [1360, 390]) {
test(`状态动画：事件取出和绑定与减少动态效果 ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1100 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await startLearning(page)
  await jumpTo(page, 1)
  const samples = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  expect(samples.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(samples.at(-1)).toHaveLength(0)
  expect(samples.every(rows => rows.every(row => row.x >= 0 && row.right <= width))).toBe(true)
  const bind = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  expect(bind.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(bind.at(-1)).toHaveLength(1)
  expect(bind.every(rows => rows.every(row => row.x >= 0 && row.right <= width))).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await jumpTo(page, 1)
  const reducedPop = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  expect(reducedPop.slice(1).every(rows => rows.length === 0)).toBe(true)
  const reduced = await sampleStep(page, 'S0 起点 (0, 0)', '下一步')
  const destination = reduced.at(-1)![0].y
  expect(reduced.slice(1).every(rows => rows.length === 1 && Math.abs(rows[0].y - destination) < 1 && rows[0].opacity === 1)).toBe(true)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})
}

test('状态动画：活动线段进入、退出与反向插入', async ({ page }) => {
  const trace = await startLearning(page)
  await jumpTo(page, stepIndex(trace, step => step.action === 'insert') - 1)
  const enter = await sampleStep(page, 'S0', '下一步')
  expect(enter[0]).toHaveLength(0)
  expect(enter.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  const empty = await sampleStep(page, 'S0', '上一步')
  expect(empty.some(rows => rows.some(row => row.opacity > 0.05 && row.opacity < 0.95))).toBe(true)
  expect(empty.at(-1)).toHaveLength(0)
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, stepIndex(trace, step => step.action === 'remove' && step.subjects.includes(1)) - 1)
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
  const trace = await startLearning(page)
  const reorder = stepIndex(trace, step => step.action === 'reorder')
  await jumpTo(page, reorder - 1)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(reorder))
  const order = page.getByTestId('active-order')
  await expect(order).toHaveText('S1S0')
  const backwards = await sampleStep(page, 'S0', '上一步')
  expect(backwards.at(-1)).toHaveLength(0)
  expect(backwards.every(rows => rows.every(row => row.x >= 0 && row.right <= width))).toBe(true)
  await page.keyboard.press('ArrowRight')
  await order.getByText('S0', { exact: true }).hover()
  await expect(page.getByRole('img', { name: '输入 S0', exact: true })).toHaveAttribute('data-highlighted', 'true')
  await jumpTo(page, 0)
  await expect(order).toHaveText('空')
  await expect(page.locator('aside li')).toHaveCount(4)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await jumpTo(page, reorder - 1)
  const reduced = await sampleStep(page, 'S0', '下一步')
  const destination = reduced.at(-1)![0].y
  expect(reduced.slice(1).every(rows => rows.length === 1 && Math.abs(rows[0].y - destination) < 1)).toBe(true)
})
}
