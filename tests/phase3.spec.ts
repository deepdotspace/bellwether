/**
 * Verifies the second wave of features end-to-end for a signed-in user:
 * Daily Five + streak, the AI Analyst modal, and publishing a public profile.
 */
import { test, expect } from 'deepspace/testing'

const QUILL_A_ID = 'NgMlKrKEGYJCTttpj4kdoZbVFjd991CZ'

test('Daily Five page renders the day’s challenge', async ({ users }) => {
  const [user] = await users(['Quill A'])
  const page = user.page
  await page.goto('/daily')
  await expect(page.getByRole('heading', { name: 'The Daily Five' })).toBeVisible({ timeout: 15_000 })
  // At least one numbered/forecastable card is present.
  await expect(page.getByText(/forecasted today/i).or(page.getByText("Today's done"))).toBeVisible({
    timeout: 15_000,
  })
  await page.screenshot({ path: 'test-results/daily.png', fullPage: false })
})

test('AI Analyst generates a news-sourced write-up', async ({ users }) => {
  const [user] = await users(['Quill A'])
  const page = user.page
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Top movers' })).toBeVisible({ timeout: 15_000 })
  // Open the Analyst on the first card.
  await page.getByRole('button', { name: 'Open AI Analyst' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Auto-generates: wait for the bull/bear analysis to land.
  await expect(dialog.getByText(/Bull case/i)).toBeVisible({ timeout: 45_000 })
  await expect(dialog.getByText(/Bear case/i)).toBeVisible()
  await page.screenshot({ path: 'test-results/analyst.png', fullPage: false })
})

test('publishing a profile makes the public page render', async ({ users }) => {
  const [user] = await users(['Quill A'])
  const page = user.page
  await page.goto('/scorecard')
  await expect(page.getByRole('heading', { name: 'Public profile' })).toBeVisible({ timeout: 15_000 })
  // Wait until the user is loaded — the publish switch is disabled until then
  // (so the write never races ahead of the authenticated WebSocket).
  const sw = page.getByRole('switch', { name: 'Make profile public' })
  await expect(sw).toBeEnabled({ timeout: 15_000 })
  if ((await sw.getAttribute('aria-checked')) !== 'true') {
    await sw.click()
  }
  // Confirmation toast tells us the write landed.
  await expect(page.getByText('Profile published')).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: 'test-results/scorecard-publish.png', fullPage: false })

  // The public page renders the published profile.
  await page.goto(`/u/${QUILL_A_ID}`)
  await expect(page.getByText('Bellwether forecaster')).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: 'test-results/public-profile.png', fullPage: false })
})
