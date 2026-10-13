import { expect, test } from '@playwright/test'
import { tabToReachable } from '../support/keyboard'

test('Tab reachability tolerates an inserted control and activates the target', async ({ page }) => {
  await page.setContent('<button>Start</button><button>New help</button><button>Target</button>')
  await page.getByRole('button', { name: 'Start', exact: true }).focus()
  const target = page.getByRole('button', { name: 'Target', exact: true })
  await target.evaluate(element => element.addEventListener('click', () => { element.textContent = 'Activated' }))
  await tabToReachable(page, target)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Activated', exact: true })).toBeFocused()
})

for (const failure of ['excluded', 'trapped']) {
  test(`Tab reachability rejects a target that is ${failure}`, async ({ page }) => {
    await page.setContent('<button>Start</button><button>Target</button>')
    const start = page.getByRole('button', { name: 'Start', exact: true })
    const target = page.getByRole('button', { name: 'Target', exact: true })
    if (failure === 'excluded') {
      await target.evaluate(element => element.setAttribute('tabindex', '-1'))
    } else {
      await start.evaluate(element => element.addEventListener('keydown', event => {
        if ((event as KeyboardEvent).key === 'Tab') event.preventDefault()
      }))
    }
    await start.focus()
    await expect(tabToReachable(page, target)).rejects.toThrow('Tab focus cycled')
  })
}
