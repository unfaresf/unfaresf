import { test, expect } from '@playwright/test'

// Public routes — run with the `public` project (no stored auth).
// Assertions target server-rendered identity anchors (headings/titles) plus
// Nuxt UI-rendered controls (UButton/UInput), so they catch both routing and
// component-render regressions across the v2→v3→v4 migration.

test('home (index) renders the report entry point', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/UnfareSF/i)
  // "Recent Sightings" is unique to index.vue (report.vue uses "Report Sighting").
  await expect(page.getByRole('heading', { name: 'Recent Sightings' })).toBeVisible()
})

test('report page renders the report form', async ({ page }) => {
  await page.goto('/report')
  await expect(page.getByRole('heading', { name: 'Report Sighting' })).toBeVisible()
  await expect(page.locator('form').first()).toBeVisible()
})

test('sign-in page shows a passkey sign-in control', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('sign-up page shows the username field and submit control', async ({ page }) => {
  await page.goto('/sign-up')
  await expect(page.locator('input[name="username"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
})

test('thank-you page renders the success message', async ({ page }) => {
  await page.goto('/thank-you')
  await expect(page.getByRole('heading', { name: /success/i })).toBeVisible()
})
