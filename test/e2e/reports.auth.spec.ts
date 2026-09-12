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
  // Registered before goto: the client-side fetch (useLazyFetch, server:false)
  // can resolve before goto's load event does, and waitForResponse only ever
  // catches responses that happen after it's registered.
  const initialReports = waitForReportsFetch(page)
  const initialBroadcasts = waitForBroadcastsFetch(page)
  await page.goto('/reports')
  // Let the initial fetch settle first, so it can't be mistaken for the
  // response triggered by the click below.
  await Promise.all([initialReports, initialBroadcasts])

  const refreshButton = page.getByRole('button', { name: /refresh/i })
  await expect(refreshButton).toBeVisible()

  const reportsResponse = waitForReportsFetch(page)
  const broadcastsResponse = waitForBroadcastsFetch(page)

  await refreshButton.click()

  // Both requests fire from a single click; each resolves on its own,
  // so a slow one never blocks the other's list from updating.
  await Promise.all([reportsResponse, broadcastsResponse])
})

test('refresh advances the broadcasts "from" window instead of reusing the mount-time value', async ({ page }) => {
  const initialBroadcasts = waitForBroadcastsFetch(page)
  await page.goto('/reports')
  const initialResponse = await initialBroadcasts
  const initialFrom = new URL(initialResponse.url()).searchParams.get('from')
  expect(initialFrom).not.toBeNull()

  // Force a detectable gap: `from` is millisecond-precision, but a same-tick
  // refresh could land on the same millisecond as mount and look unchanged
  // even if the underlying bug (a frozen computed) were still present.
  await page.waitForTimeout(50)

  const refreshButton = page.getByRole('button', { name: /refresh/i })
  const nextBroadcasts = waitForBroadcastsFetch(page)
  await refreshButton.click()
  const nextResponse = await nextBroadcasts
  const nextFrom = new URL(nextResponse.url()).searchParams.get('from')

  expect(new Date(nextFrom!).getTime()).toBeGreaterThan(new Date(initialFrom!).getTime())
})

test('coming back to the foreground refreshes reports and broadcasts', async ({ page }) => {
  // Registered before goto (see note in the previous test).
  const initialReports = waitForReportsFetch(page)
  const initialBroadcasts = waitForBroadcastsFetch(page)
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  // Let the initial client-side fetch settle first.
  await Promise.all([initialReports, initialBroadcasts])

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
