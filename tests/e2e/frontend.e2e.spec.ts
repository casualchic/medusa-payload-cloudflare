import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // The app redirects to /us (country code), so check for Medusa storefront title
    await expect(page).toHaveTitle(/Medusa Next.js Starter Template/)

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Basic check that the page loaded successfully
    await expect(page.locator('body')).toBeVisible()
  })
})
