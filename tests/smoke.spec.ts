import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
}

test.describe('Smoke tests', () => {
  test('app loads without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForApp(page)
    expect(errors).toEqual([])
  })

  test('brief page shows the Bellwether hero', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: 'Bellwether', level: 1 })).toBeVisible()
    await expect(page.getByText('What the smart money thinks', { exact: false })).toBeVisible()
  })

  test('page title is app-specific', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bellwether/)
  })

  test('no scaffold placeholder text remains', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.locator('text=Your DeepSpace app is running')).toHaveCount(0)
    await expect(page.locator('text=docs.deep.space')).toHaveCount(0)
    await expect(page.locator('text=Welcome back')).toHaveCount(0)
  })

  test('brief renders a section or a clear empty state', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    // Either the published brief (section headers) or the no-brief CTA.
    const movers = page.getByRole('heading', { name: 'Top movers' })
    const empty = page.getByText('No brief published yet')
    await expect(movers.or(empty).first()).toBeVisible({ timeout: 15000 })
  })

  test('digest link is in the nav', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(
      page.getByTestId('app-navigation').getByRole('link', { name: 'Digest', exact: true }),
    ).toBeVisible()
  })

  test('sign-in button visible when logged out', async ({ page }) => {
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('nav-sign-in-button')).toBeVisible()
  })

  test('edition page renders (read or empty state)', async ({ page }) => {
    await page.goto('/edition')
    await waitForApp(page)
    const masthead = page.getByText('The Edition', { exact: false })
    const empty = page.getByText('No edition yet')
    await expect(masthead.or(empty).first()).toBeVisible({ timeout: 15000 })
  })

  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForApp(page)
    await expect(page.locator('text=404')).toBeVisible()
  })
})
