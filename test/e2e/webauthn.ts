import type { Page } from '@playwright/test'

/**
 * Installs a Chromium CDP virtual authenticator so WebAuthn register/authenticate
 * flows work headlessly. Must be called BEFORE the passkey ceremony on that page.
 *
 * The app configures `residentKey: "required"` (nuxt.config.ts
 * webauthn.register.authenticatorSelection), so the authenticator must support
 * resident keys and auto-pass user verification.
 */
export async function addVirtualAuthenticator(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page)
  await client.send('WebAuthn.enable')
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,       // app requires residentKey: "required"
      hasUserVerification: true,
      isUserVerified: true,       // auto-pass the user-verification gesture
      automaticPresenceSimulation: true,
    },
  })
}
