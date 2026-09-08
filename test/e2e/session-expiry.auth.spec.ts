import { test, expect } from '@playwright/test'

// Auth project: runs with the logged-in Admin+Editor passkey user whose
// storageState is saved by test/e2e/global-setup.ts.
//
// Proves ONLY the client-side session-expiry bounce:
//   expired `unfare-session` cookie + a client-side /api/** call
//     -> 401 -> navigateTo('/sign-in', { query: { redirect: <fullPath> } })
//        + a "Your session expired" warning toast
// (see app/plugins/api-auth-guard.client.ts + app/composable/authErrorGuard.ts)
//
// A full page.goto()/reload after clearing cookies is deliberately avoided: an
// SSR navigation is caught by app/middleware/auth.ts, which redirects to a bare
// /sign-in (no ?redirect= param) and never reaches the client interceptor.
//
// The trigger is the ReportCard "Dismiss" button on /reports. Its handler
// (app/pages/reports/index.vue `dismiss()`) makes a *bare*
// $fetch('/api/reports/:id', { method: 'PUT' }) — no per-call onResponseError —
// so the 401 goes straight through the global $fetch interceptor. (The page's
// list fetch also reaches the guard now, via reportNonAuthError forwarding, but
// re-running it means driving the status-filter/pagination watch, which is more
// brittle than one button click.)

test('expired session on a client-side API call bounces to sign-in with redirect param + toast', async ({ page }) => {
  // Seed one un-reviewed report so the list renders a ReportCard with a Dismiss
  // button. POST /api/reports allows guests (shared/utils/abilities.ts), and
  // page.request shares the browser context's auth cookies.
  const created = await page.request.post('/api/reports', { data: { passenger: true } })
  expect(created.ok()).toBeTruthy()

  const initialList = page.waitForResponse(
    (r) => r.url().includes('/api/reports?') && r.request().method() === 'GET',
  )
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible()
  await initialList

  const dismiss = page.getByRole('button', { name: 'Dismiss report' })
  await expect(dismiss).toBeVisible()

  // Simulate the sealed session cookie expiring.
  await page.context().clearCookies()

  // Bare client-side /api/** call -> 401 -> global auth guard.
  const putResponse = page.waitForResponse(
    (r) => /\/api\/reports\/\d+$/.test(r.url()) && r.request().method() === 'PUT',
  )
  await dismiss.click()
  expect((await putResponse).status()).toBe(401)

  await expect(page).toHaveURL(/\/sign-in\?redirect=/)
  // The toast: role="alert" wrapper + inner title div both carry the text, so
  // scope to the alert and take the first match.
  await expect(
    page.locator('[role="alert"]').filter({ hasText: /session expired/i }).first(),
  ).toBeVisible()
})
