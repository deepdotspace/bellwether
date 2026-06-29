/**
 * Forecasting loop — a signed-in user logs a call on a market and sees it on
 * their scorecard. Exercises the userBound `calls` write + read-own RBAC.
 *
 * Uses the deepspace/testing `users` fixture (cached test-account sign-in).
 */
import { test, expect } from 'deepspace/testing'

test('a signed-in user can log a call and see it on the scorecard', async ({ users }) => {
  const [user] = await users(['Quill A'])
  const page = user.page

  await page.goto('/home')
  await expect(page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  // Wait for the brief to render at least one market card.
  await expect(page.getByRole('heading', { name: 'Top movers' })).toBeVisible({ timeout: 15_000 })

  // Log a call if this account hasn't already on a visible card.
  const makeCall = page.getByRole('button', { name: 'Make your call' }).first()
  if (await makeCall.isVisible().catch(() => false)) {
    await makeCall.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Pick a confident probability via a quick chip, then log.
    await dialog.getByRole('button', { name: '75%' }).click()
    await dialog.getByRole('button', { name: /log call/i }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })
  }

  // The card now shows the user's call.
  await expect(page.getByText(/Your call:/i).first()).toBeVisible({ timeout: 10_000 })

  // Scorecard reflects at least one logged call.
  await page.getByTestId('app-navigation').getByRole('link', { name: 'Scorecard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your scorecard' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Calls logged')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Open calls \(([1-9]\d*)\)/ })).toBeVisible({ timeout: 10_000 })
})
