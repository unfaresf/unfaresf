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

function waitForReportsFetch(page: import('@playwright/test').Page) {
  return page.waitForResponse((res) => res.url().includes('/api/reports') && res.request().method() === 'GET')
}
function waitForBroadcastsFetch(page: import('@playwright/test').Page) {
  return page.waitForResponse((res) => res.url().includes('/api/broadcasts') && res.request().method() === 'GET')
}

test('refresh button re-fetches reports and broadcasts independently', async ({ page }) => {
  await page.goto('/reports')
  // Let the initial client-side fetch (useLazyFetch, server:false) settle first,
  // so it can't be mistaken for the response triggered by the click below.
  await Promise.all([waitForReportsFetch(page), waitForBroadcastsFetch(page)])

  const refreshButton = page.getByRole('button', { name: /refresh/i })
  await expect(refreshButton).toBeVisible()

  const reportsResponse = waitForReportsFetch(page)
  const broadcastsResponse = waitForBroadcastsFetch(page)

  await refreshButton.click()

  // Both requests fire from a single click; each resolves on its own,
  // so a slow one never blocks the other's list from updating.
  await Promise.all([reportsResponse, broadcastsResponse])
})

test('coming back to the foreground refreshes reports and broadcasts', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  // Let the initial client-side fetch settle first (see note above).
  await Promise.all([waitForReportsFetch(page), waitForBroadcastsFetch(page)])

  // Simulate the PWA being backgrounded then foregrounded: override
  // document.visibilityState and dispatch the event the app listens to,
  // since real OS-level backgrounding isn't reachable from Playwright.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })

  const reportsResponse = waitForReportsFetch(page)
  const broadcastsResponse = waitForBroadcastsFetch(page)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await Promise.all([reportsResponse, broadcastsResponse])
})
