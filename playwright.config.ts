import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
// The Nuxt dev server serves HTTPS on localhost (Vite auto-generates a
// self-signed cert when the TLS paths are empty). localhost https is a
// WebAuthn-secure context; ignoreHTTPSErrors below accepts the self-signed cert.
const BASE_URL = `https://localhost:${PORT}`

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,          // shares one DB + one dev server
  workers: 1,
  retries: 0,
  timeout: 60_000,
  globalSetup: './test/e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,     // harmless on http; needed if the server forces https
    trace: 'on-first-retry',
    storageState: 'test/e2e/.auth/user.json',
  },
  projects: [
    // Public routes run WITHOUT stored auth.
    { name: 'public', use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } }, testMatch: /.*\.public\.spec\.ts/ },
    // Auth routes reuse the storageState saved by global-setup.
    { name: 'auth', use: { ...devices['Desktop Chrome'] }, testMatch: /.*\.auth\.spec\.ts/ },
  ],
  webServer: {
    command: 'npx dotenv -e .env.e2e -- npx nuxi dev --no-fork --port ' + PORT,
    url: BASE_URL,
    // The readiness probe has its own ignoreHTTPSErrors (separate from `use`);
    // without it Playwright rejects the dev server's self-signed cert forever.
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
