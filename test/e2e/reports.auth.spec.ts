import { test, expect } from '@playwright/test'

// Auth project: starts logged-in via storageState saved by global-setup
// (an Admin+Editor passkey user). Assertions target server-rendered headings
// plus the status-filter control, tolerant of the v2→v3 control change.

test('reports list loads for an authed admin', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recent Broadcasts' })).toBeVisible()
})

test('status filter control is present', async ({ page }) => {
  await page.goto('/reports')
  // USelect renders a native <select> in v2; v3 renders a button-based listbox.
  await expect(
    page.locator('select, [role="listbox"], button[aria-haspopup]').first(),
  ).toBeVisible()
})
