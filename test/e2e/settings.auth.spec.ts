import { test, expect } from '@playwright/test'

// Auth/admin page. The integration sub-components (and their toggles) render
// after /api/integrations resolves; the section headings are server-rendered.

test('settings page loads with integration controls', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Mastodon' })).toBeVisible()
  // UToggle (v2) → USwitch (v3); both expose role="switch".
  await expect(page.locator('[role="switch"]').first()).toBeVisible()
})
