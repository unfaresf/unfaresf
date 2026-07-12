import { chromium, type FullConfig } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthn'
import { mkdirSync } from 'node:fs'

// Matches .env.e2e. This UUID is the SIGN_UP_KEY; passing it as `invite-id`
// bypasses the invite table (server/api/webauthn/register.post.ts) and creates
// an Admin+Editor user, so no seeded invite row is needed.
const SIGN_UP_KEY = '7e3717d6-ccc8-444d-a8e7-78e212e842f9'
const BASE_URL = 'https://localhost:3000'

export default async function globalSetup(_config: FullConfig) {
  mkdirSync('test/e2e/.auth', { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: BASE_URL })
  const page = await context.newPage()
  await addVirtualAuthenticator(page)

  // The invite is supplied via the `invite-id` query param (pages/sign-up.vue
  // reads query['invite-id']); the page itself only has a username field.
  await page.goto(`/sign-up?invite-id=${SIGN_UP_KEY}`)

  // Wait for the submit button itself to be hydrated before interacting.
  // The root #__nuxt.__vue_app__ is set at mount-start (too early); the button's
  // Vue markers appear only once its subtree — including the form's
  // `@submit.prevent` listener — is hydrated. Clicking earlier triggers a native
  // GET submit that drops the invite-id query and skips the passkey ceremony.
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[type="submit"]') as
        | (HTMLButtonElement & { __vnode?: unknown; __vueParentComponent?: unknown })
        | null
      return !!(btn && (btn.__vueParentComponent || btn.__vnode))
    },
    undefined,
    { timeout: 15_000 },
  )

  await page.locator('input[name="username"]').fill('e2e-admin')
  await page.getByRole('button', { name: /sign up/i }).click()

  // Wait for the `unfare-session` cookie, which is set the moment registration
  // succeeds (Set-Cookie on the webauthn verify response). This is independent of
  // how long the authenticated landing page (`navigateTo('/')`) takes to render
  // its data — on a cold dev server that render can exceed a page-URL wait.
  const deadline = Date.now() + 30_000
  let hasSession = false
  while (Date.now() < deadline) {
    const cookies = await context.cookies()
    if (cookies.some((c) => c.name === 'unfare-session')) {
      hasSession = true
      break
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  if (!hasSession) {
    const toastText = await page.locator('[role="alert"], .fixed').allInnerTexts().catch(() => [])
    throw new Error(
      `E2E global-setup: no unfare-session cookie after sign-up (url ${page.url()}). ` +
      `Toast/error text: ${JSON.stringify(toastText)}.`,
    )
  }

  await context.storageState({ path: 'test/e2e/.auth/user.json' })
  await browser.close()
}
