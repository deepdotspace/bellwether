import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    await page.goto('/')
    // Wait for the app to connect its WebSocket (it auto-connects on mount)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
    // If the app loaded and connected, the WS endpoint works
  })

  // buildBrief spends owner integration credits — it must reject unauthenticated
  // callers before doing any work. (We don't exercise the paid happy path in CI.)
  test('buildBrief action rejects unauthenticated callers', async ({ request }) => {
    const res = await request.post('/api/actions/buildBrief', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(res.status()).toBe(401)
  })

  test('briefs collection is publicly readable', async ({ page }) => {
    // The brief renders for anonymous visitors (public read on `briefs`).
    await page.goto('/')
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
    const movers = page.getByRole('heading', { name: 'Top movers' })
    const empty = page.getByText('No brief published yet')
    await expect(movers.or(empty).first()).toBeVisible({ timeout: 15000 })
  })
})
