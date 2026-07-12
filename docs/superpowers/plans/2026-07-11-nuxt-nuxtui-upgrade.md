# Nuxt & Nuxt UI Major-Version Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `@nuxt/ui` 2.22 → 4.x and `nuxt` 3.21 → 4.x, one major at a time, preserving all existing behavior.

**Architecture:** Three sequential phases on a single long-lived `upgrade` branch — (1) Nuxt UI v2→v3, (2) Nuxt 3→4, (3) Nuxt UI v3→v4 — each gated by a regression suite. Nuxt UI v3 runs on both Nuxt 3 and 4, so the UI migration is isolated from the framework migration; Nuxt UI v4 requires Nuxt 4, so it comes last. A Playwright E2E suite (with a Chromium virtual-authenticator for passkeys) plus the existing vitest suite is the gate between phases.

**Tech Stack:** Nuxt, Nuxt UI, Vue 3, Vite, Tailwind CSS, Reka UI (v3+), Drizzle ORM + better-sqlite3, nuxt-auth-utils (WebAuthn/passkeys), vitest + @nuxt/test-utils, Playwright.

## Global Constraints

These apply to **every task**. Copy exact values verbatim.

- **Node version:** `24` (see `.node-version` / `package.json` engines). Use the repo's Node.
- **Work location:** the **primary checkout** `/Users/andy/projects/unfaresf`. **Never use a git worktree** for this work. (This plan and its spec were authored in a worktree branch `claude/nuxt-ui-upgrade-plan-a30de8`; Task 0.1 brings the docs into the primary repo and abandons the worktree.)
- **Branch:** one long-lived branch named exactly `upgrade`, cut from `main`. All phases commit to it. Merge to `main` only after Phase 3 passes. No per-phase PRs.
- **One major at a time:** never combine two major upgrades in one commit.
- **Codemods first:** always run the official codemod/upgrade tool when one exists, then hand-fix the remainder. Tools used: `npx nuxt upgrade`, `npx @tailwindcss/upgrade`, `npx codemod nuxt/4/migration-recipe`, `npx codemod nuxt/4/file-structure`, `npx codemod nuxt/4/shallow-function-reactivity`, `npx codemod nuxt/4/deprecated-dedupe-value`.
- **Clean code over pixel-perfect:** minor px shifts in padding/margins/line-widths are acceptable. **Do NOT add utility classes to reproduce pixels.** Prefer Nuxt UI v3 design tokens (`text-muted`, `text-dimmed`, `text-highlighted`, `bg-muted`, `border-default`) and global `app.config.ts` config over per-element classes.
- **Behavior-preserving:** no feature changes. Every existing page, form, and API must keep working.
- **Gate before commit:** a task's changes are committed only after its verification commands are green.
- **Secure context for auth:** WebAuthn/passkeys require a secure context. E2E runs against `http://localhost` (a WebAuthn-secure origin) with `NUXT_AUTH_ORIGIN`/`AUTH_ORIGIN` set to the served origin; passkeys are driven by the Chromium CDP virtual authenticator. Andy can assist with real-passkey auth if automation stalls.
- **Reference docs (fetch as needed):** Nuxt UI v3 migration `https://ui.nuxt.com/docs/getting-started/migration/v3`; Nuxt UI v4 migration `https://ui.nuxt.com/docs/getting-started/migration/v4`; Nuxt 3→4 upgrade `https://nuxt.com/docs/4.x/getting-started/upgrade`; Tailwind v4 upgrade `https://tailwindcss.com/docs/upgrade-guide`. The `nuxt-ui` MCP tools `get-migration-guide` and `get-component` return the same content.
- **Design spec:** `docs/superpowers/specs/2026-07-11-nuxt-nuxtui-upgrade-design.md` (full rationale and app-surface inventory).

---

## Baseline notes (captured 2026-07-11, commit `a9ececa`, before any code change)

Recorded per Task 0.1 Step 4. Environment as executed: node `v24.3.0` (`.node-version` pins `24.18.0`; engines only require major `24`, so this satisfies it), `nuxt@3.21.8`, `@nuxt/ui@2.22.3`, `tailwindcss@3.4.19` (transitive).

Two adaptations to the plan's Task 0.1 were required and applied:

1. **Branch already existed.** Execution began already on branch `upgrade` (at `origin/main`, no divergence) with the two docs staged. So instead of `git checkout main && git checkout -b upgrade`, the docs were simply committed (`phase0: add upgrade spec + plan`). No re-cut needed.
2. **Planning worktree removed early.** The redundant planning worktree `.claude/worktrees/nuxt-ui-upgrade-plan-a30de8` (clean, its only unique commit added the identical docs) was polluting `npm run test` — vitest scanned its nested copies of the test files and reported 10 spurious file-load failures. Removed it via `git worktree remove` (branch ref `claude/nuxt-ui-upgrade-plan-a30de8` preserved) to get a clean gate. This is the abandonment the plan's Task 0.1 / Task 4.1 call for, done up front.

**Baseline gate results (after worktree removal + fresh `nuxi prepare`):**

| Gate | Result | Notes |
|---|---|---|
| `npm run test` (vitest) | ✅ green | 10 files, 40 tests. **This is what CI runs.** |
| `npm run build` | ✅ green | `.output/` produced. |
| `npm run typecheck` | ❌ **33 pre-existing errors across 13 files** | Not run by CI. Unrelated to the upgrade. See snapshot below. |

**Decision (confirmed with Andy): document + gate on no-regressions.** The 33 pre-existing type errors are left untouched (behavior-preserving). The phase gate is therefore:

- **Hard-green gates:** `npm run test` and `npm run build` must be fully green after every phase.
- **Typecheck gate:** `npm run typecheck` must introduce **zero NEW errors** beyond the recorded baseline (compare by `file + TScode`, ignoring line/col which shift as code moves — e.g. the Phase 2 `app/` move). Reductions are welcome; regressions block.

The exact normalized baseline (33 errors, `file : TScode`, sorted) is committed at `docs/superpowers/baseline-typecheck.txt` for precise per-phase comparison. Summary by file: `components/routes-map.client.vue` ×14 (maplibre GeoJSON typings), `server/cron/masto-poster.ts` ×4, `server/utils/fetch-unpublished-broadcasts.test.ts` ×3, `server/sqlite-service.ts` ×2, `server/cron/masto-poller.ts` ×2, and one each in `composable/config.ts`, `pages/index.vue`, `pages/reports/index.vue`, `server/api/broadcasts/geo.get.ts`, `server/api/integrations/index.post.ts`, `shared/utils/notify.ts`, `shared/utils/unfareLogger.ts`, `test/test.setup.ts`.

---

## Repository Orientation (read once before starting)

Zero-context primer on this codebase:

- **Framework:** Nuxt (SSR + Nitro server). Flat directory layout today (no `app/` dir): `pages/`, `components/`, `layouts/`, `middleware/`, `plugins/`, `composable/` (singular — non-standard), `server/`, `shared/`, `db/`.
- **UI:** `@nuxt/ui` v2 (component prefix `U*`). Config in `nuxt.config.ts` (`modules`, `runtimeConfig`) and `app.config.ts` (`ui.primary`/`ui.gray`). There is **no `app.vue`** — Nuxt auto-generates one.
- **Auth:** `nuxt-auth-utils` with WebAuthn (`auth.webAuthn: true`). Session cookie name `unfare-session`. Admin/auth middleware in `middleware/auth.ts`, `middleware/admin.ts`.
- **Data:** two SQLite DBs via `better-sqlite3` + Drizzle — app DB (`DB_FILE_NAME`) and GTFS DB (`GTFS_DB_FILE_PATH`). Schema in `db/`. Server routes in `server/api/**`.
- **Tests:** `npm run test` (vitest, `@nuxt/test-utils`). Config `vitest.config.ts` (environment `nuxt`, `fileParallelism: false`, setup `test/test.setup.ts`). Component tests live next to components (`components/*.test.ts`). `.env.test` holds test env (incl. `SIGN_UP_KEY=7e3717d6-ccc8-444d-a8e7-78e212e842f9`).
- **Pages (9):** `index` (public report form), `report`, `thank-you`, `sign-in` (passkey), `sign-up` (invite-key + passkey register), `reports/index` (auth: list + filter + pagination + approve-modal), `reports/[id]` (auth), `settings` (auth/admin: integration toggles + forms), `invite` (auth/admin).
- **Nuxt UI components in use (tag → count):** `UButton`×31, `UIcon`×26, `UFormGroup`×21, `UCard`×14, `UInput`×11, `UContainer`×10, `UForm`×6, `UToggle`×5, `USkeleton`×4, `USelectMenu`×4, `UTooltip`×3, `UPopover`×3, `ULink`×3, `UPagination`×2, `UNotifications`×2, `UModals`×2, `UTable`×1, `USelect`×1, `URadioGroup`×1, `UModal`×1, `UDivider`×1, `UButtonGroup`×1, `UAvatar`×1.

---

# PHASE 0 — Setup & Regression Safety Net

Goal: known-green baseline in the primary repo on the `upgrade` branch, plus a reusable E2E suite that can exercise passkey-gated features.

### Task 0.1: Create the `upgrade` branch and capture the baseline

**Files:**
- Modify: none (branch + install only)
- Bring over: `docs/superpowers/specs/2026-07-11-nuxt-nuxtui-upgrade-design.md`, `docs/superpowers/plans/2026-07-11-nuxt-nuxtui-upgrade.md`

- [ ] **Step 1: Move to the primary repo and cut the branch**

The spec + this plan currently live on branch `claude/nuxt-ui-upgrade-plan-a30de8` (authored in a worktree). Git worktrees share the object store, so the primary repo can pull those files from that branch.

Run (from `/Users/andy/projects/unfaresf`):
```bash
cd /Users/andy/projects/unfaresf
git status                      # confirm clean; if not, stash/commit unrelated work
git checkout main
git pull --ff-only
git checkout -b upgrade
git checkout claude/nuxt-ui-upgrade-plan-a30de8 -- \
  docs/superpowers/specs/2026-07-11-nuxt-nuxtui-upgrade-design.md \
  docs/superpowers/plans/2026-07-11-nuxt-nuxtui-upgrade.md
git add docs/superpowers && git commit -m "phase0: add upgrade spec + plan"
```
Expected: on branch `upgrade`, both docs present, one commit made.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
```
Expected: completes without peer-dependency errors (`.npmrc` sets `strict-peer-dependencies=false`, `shamefully-hoist=true`).

- [ ] **Step 3: Capture the baseline gate (must be green before any change)**

Run each and record the result:
```bash
npm run test        # vitest
npm run typecheck   # nuxt typecheck (vue-tsc)
npm run build       # nuxt build → .output/
```
Expected: `npm run test` all pass; `npm run typecheck` no errors; `npm run build` succeeds and creates `.output/`.

- [ ] **Step 4: If anything is red**, fix or document it in `docs/superpowers/plans/2026-07-11-nuxt-nuxtui-upgrade.md` under a new "Baseline notes" heading BEFORE proceeding. A non-green baseline invalidates the gate. Commit any baseline fix:
```bash
git commit -am "phase0: fix pre-existing baseline failure (<describe>)"
```

### Task 0.2: Add Playwright E2E infrastructure

**Files:**
- Create: `playwright.config.ts`
- Create: `.env.e2e`
- Create: `test/e2e/` (dir)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install the Playwright test runner + browser**

`playwright-core` is already a dep but the test runner is not.
```bash
npm i -D @playwright/test
npx playwright install chromium
```
Expected: `@playwright/test` in `devDependencies`; Chromium downloaded.

- [ ] **Step 2: Create an E2E env file that makes localhost the auth origin**

The app defaults the WebAuthn origin to `https://localhost:3000`. For E2E we serve plain `http://localhost:3000` (localhost is a WebAuthn-secure context) and point the origin at it.

Create `.env.e2e`:
```dotenv
NUXT_SESSION_PASSWORD=WfLEJfD7NMdewQ8oQxvoE7qUK86FQ8fc7TvVsdDCZJ6DvpqhfudRHcy4xCPLdwB9
NUXT_AUTH_ORIGIN=http://localhost:3000
AUTH_ORIGIN=http://localhost:3000
DB_FILE_NAME=db/data/local-e2e.db
SIGN_UP_KEY=7e3717d6-ccc8-444d-a8e7-78e212e842f9
MASTODON_DRY_RUN=true
BSKY_DRY_RUN=true
LOG_LEVEL=2
GTFS_DB_FILE_PATH=db/data/gtfs-test.db
AGENCY_ALT_NAMES={"SF":"Muni","BA":"BART"}
SHIFT_LENGTH=8
# leave TLS paths empty so the dev server serves http, not https
LOCAL_DEV_TLS_KEY_PATH=
LOCAL_DEV_TLS_CERT_PATH=
```

> Note: `nuxt.config.ts` sets `devServer.https` from the (now-empty) TLS env vars. Empty values make Nuxt serve HTTP. If Nuxt still forces HTTPS, the executor may instead generate a localhost cert and set `ignoreHTTPSErrors: true` in `playwright.config.ts` (see Step 3 comment).

- [ ] **Step 3: Create the Playwright config**

Create `playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

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
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```
Install the tiny env loader used by `webServer`:
```bash
npm i -D dotenv-cli
```

- [ ] **Step 4: Add npm scripts**

In `package.json` `scripts`, add:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 5: Gitignore E2E artifacts**

Append to `.gitignore`:
```
/test-results/
/playwright-report/
/test/e2e/.auth/
/db/data/local-e2e.db
```

- [ ] **Step 6: Commit**
```bash
git add playwright.config.ts .env.e2e package.json package-lock.json .gitignore
git commit -m "phase0: add Playwright e2e infra"
```

### Task 0.3: WebAuthn virtual-authenticator fixture + auth global-setup

**Files:**
- Create: `test/e2e/webauthn.ts` (CDP virtual-authenticator helper)
- Create: `test/e2e/global-setup.ts` (registers a passkey once, saves storageState)

**Interfaces:**
- Produces: `addVirtualAuthenticator(page)` → `Promise<void>` (installs a CTAP2 virtual authenticator with resident-key + user-verification so registration/assertion succeed without hardware).

- [ ] **Step 1: Create the virtual-authenticator helper**

The app requires `residentKey: "required"` (see `nuxt.config.ts` `webauthn.register.authenticatorSelection`). Configure the virtual authenticator accordingly.

Create `test/e2e/webauthn.ts`:
```ts
import type { Page } from '@playwright/test'

/**
 * Installs a Chromium CDP virtual authenticator so WebAuthn register/authenticate
 * flows work headlessly. Must be called BEFORE the passkey ceremony on that page.
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
```

- [ ] **Step 2: Create the global setup that registers a user + saves the session**

This drives the real sign-up flow (invite key + passkey registration) once, then persists the authenticated session cookie for the `auth` project. Adjust the selectors in the marked block to match `pages/sign-up.vue` (read that file first).

Create `test/e2e/global-setup.ts`:
```ts
import { chromium, type FullConfig } from '@playwright/test'
import { addVirtualAuthenticator } from './webauthn'
import { mkdirSync } from 'node:fs'

const SIGN_UP_KEY = '7e3717d6-ccc8-444d-a8e7-78e212e842f9' // matches .env.e2e
const BASE_URL = 'http://localhost:3000'

export default async function globalSetup(_config: FullConfig) {
  mkdirSync('test/e2e/.auth', { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ ignoreHTTPSErrors: true, baseURL: BASE_URL })
  const page = await context.newPage()
  await addVirtualAuthenticator(page)

  await page.goto('/sign-up')

  // --- ADJUST to match pages/sign-up.vue field names/labels ---
  await page.getByLabel(/invite|sign.?up key/i).fill(SIGN_UP_KEY)
  await page.getByLabel(/user ?name/i).fill('e2e-admin')
  await page.getByRole('button', { name: /sign.?up|register|create/i }).click()
  // -------------------------------------------------------------

  // Wait for post-registration navigation (authenticated landing).
  await page.waitForURL(/\/(reports|)$/, { timeout: 20_000 })

  await context.storageState({ path: 'test/e2e/.auth/user.json' })
  await browser.close()
}
```

- [ ] **Step 3: Reset the E2E DB before the run (clean seed each time)**

Add a pretest hook by prefixing the e2e script. Update `package.json`:
```json
"test:e2e": "rm -f db/data/local-e2e.db && playwright test"
```
Expected: each E2E run starts from an empty app DB, so sign-up always succeeds. (The GTFS DB `db/data/gtfs-test.db` is reused read-only; ensure it exists — run `npm run gtfs:init` if missing, per README.)

- [ ] **Step 4: Verify the authenticator + setup works**

Run:
```bash
npm run test:e2e -- --project=auth --list
```
Expected: Playwright lists auth specs (none yet — that's fine). The real check is Step in Task 0.5.

- [ ] **Step 5: Commit**
```bash
git add test/e2e/webauthn.ts test/e2e/global-setup.ts package.json
git commit -m "phase0: webauthn virtual authenticator + auth global-setup"
```

### Task 0.4: Public-route smoke specs

**Files:**
- Create: `test/e2e/public.public.spec.ts`

- [ ] **Step 1: Write smoke specs for every public page**

Read `pages/index.vue`, `pages/report.vue`, `pages/sign-in.vue`, `pages/sign-up.vue`, `pages/thank-you.vue` to confirm a stable, visible assertion per page (a heading, a form control, a button). Then create `test/e2e/public.public.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('home renders the report entry point', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  // TODO-on-write: assert a stable element unique to pages/index.vue (e.g. the agency select or a heading)
  await expect(page).toHaveTitle(/UnfareSF/i)
})

test('report page renders', async ({ page }) => {
  await page.goto('/report')
  await expect(page.locator('form, [role="form"]')).toBeVisible()
})

test('sign-in page shows a passkey sign-in control', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('button')).toBeVisible()
})

test('sign-up page shows the invite field', async ({ page }) => {
  await page.goto('/sign-up')
  await expect(page.locator('input')).toBeVisible()
})

test('thank-you page renders', async ({ page }) => {
  await page.goto('/thank-you')
  await expect(page.locator('body')).toBeVisible()
})
```
Replace the `TODO-on-write` line with a real assertion after reading `index.vue`. (This is the one place the executor authors an assertion; every other public assertion above targets stable structure.)

- [ ] **Step 2: Run the public specs**
```bash
npm run test:e2e -- --project=public
```
Expected: all public specs pass against the current v2 app.

- [ ] **Step 3: Commit**
```bash
git add test/e2e/public.public.spec.ts
git commit -m "phase0: public route e2e smoke specs"
```

### Task 0.5: Auth-gated smoke specs

**Files:**
- Create: `test/e2e/reports.auth.spec.ts`
- Create: `test/e2e/settings.auth.spec.ts`

- [ ] **Step 1: Write auth-gated smoke specs (use the saved session)**

The `auth` project loads `storageState` from global-setup, so these start logged-in. Read `pages/reports/index.vue` and `pages/settings.vue` for stable selectors first. Create `test/e2e/reports.auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('reports list loads for an authed admin', async ({ page }) => {
  await page.goto('/reports')
  await expect(page.getByText(/Reports/i).first()).toBeVisible()
  await expect(page.getByText(/Recent Broadcasts/i)).toBeVisible()
})

test('status filter select is present', async ({ page }) => {
  await page.goto('/reports')
  // USelect (v2) / USelect (v3) both render a native or button-based control
  await expect(page.locator('select, [role="listbox"], button[aria-haspopup]').first()).toBeVisible()
})
```
Create `test/e2e/settings.auth.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('settings page loads with integration controls', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.locator('body')).toBeVisible()
  // Toggles are UToggle (v2) → USwitch (v3); both expose role="switch"
  await expect(page.locator('[role="switch"], button[role="switch"]').first()).toBeVisible()
})
```

- [ ] **Step 2: Run the full E2E suite (public + auth)**
```bash
npm run test:e2e
```
Expected: global-setup registers the passkey via the virtual authenticator, saves the session, and all specs pass. If registration fails, read `pages/sign-up.vue` and fix the selectors in `global-setup.ts` Step 2; if the server serves HTTPS, generate a localhost cert or keep `ignoreHTTPSErrors`. **If passkey automation cannot be made to work, stop and ask Andy** (per spec §9) and fall back to the manual checklist for auth flows.

- [ ] **Step 3: Commit**
```bash
git add test/e2e/reports.auth.spec.ts test/e2e/settings.auth.spec.ts
git commit -m "phase0: auth-gated e2e smoke specs"
```

### Task 0.6: Confirm the full Phase-0 gate is green on v2

- [ ] **Step 1: Run the complete gate**
```bash
npm run typecheck && npm run test && npm run build && npm run test:e2e
```
Expected: all green. **This is the reference gate reused after every later phase.** Record pass/fail counts in the commit message.

- [ ] **Step 2: Tag the baseline**
```bash
git tag pre-upgrade-baseline
git commit --allow-empty -m "phase0: green baseline established (vitest+e2e+build)"
```

---

# PHASE 1 — Nuxt UI v2 → v3

Goal: migrate to Nuxt UI v3 (Tailwind v4 + Reka UI) on the current Nuxt 3, keeping every page/form working. This is the largest phase. Full migration reference: `npx`-fetch `https://ui.nuxt.com/docs/getting-started/migration/v3` or `nuxt-ui` MCP `get-migration-guide v3`.

### Task 1.1: Migrate Tailwind CSS v3 → v4

**Files:**
- Create: `assets/css/main.css`
- Modify: `nuxt.config.ts` (add `css`)
- Modify: many `.vue` files (`gray-*` → design tokens)
- Delete (if present): `tailwind.config.*` (none exists today; confirm)

- [ ] **Step 1: Create the CSS entry**

Create `assets/css/main.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 2: Register it in Nuxt**

In `nuxt.config.ts`, add at the top level of `defineNuxtConfig({...})`:
```ts
css: ['~/assets/css/main.css'],
```

- [ ] **Step 3: Run the Tailwind upgrade tool**
```bash
npx @tailwindcss/upgrade
```
Expected: converts config to CSS-first, updates `package.json` (Tailwind v4, `@tailwindcss/vite` or PostCSS). Review its diff. It does not know about Nuxt UI yet — that's Task 1.2.

- [ ] **Step 4: Replace hardcoded `gray-*` classes with design tokens**

There are ~177 `gray-*` occurrences. Find them:
```bash
grep -rn "gray-[0-9]" components pages layouts error.vue
```
Apply this mapping (prefer tokens — fewer classes, auto light/dark). Do NOT just mass-`sed`; apply per-context:

| v2 pattern | v3 replacement |
|---|---|
| `text-gray-500 dark:text-gray-400` | `text-muted` |
| `text-gray-400 dark:text-gray-500` | `text-dimmed` |
| `text-gray-900 dark:text-white` | `text-highlighted` |
| `bg-gray-50 dark:bg-gray-800/50` (hover) | `hover:bg-muted` (or keep neutral if token changes behavior) |
| `bg-gray-100 dark:bg-gray-800` | `bg-muted` |
| `border-gray-200 dark:border-gray-800` | `border-default` |
| any other `*-gray-N` with no clean token | `*-neutral-N` |

Work file-by-file; after each file, keep going. The heaviest files are `layouts/default.vue`, `layouts/full-screen.vue`, `pages/reports/index.vue`.

- [ ] **Step 5: Verify build + visual sanity (no UI lib yet)**
```bash
npm run build
```
Expected: build succeeds. (Nuxt UI is still v2 here; tokens like `text-muted` are provided by Nuxt UI, so full visual verification happens after Task 1.2 — that's fine, this step just checks Tailwind v4 compiles.)

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "phase1: migrate Tailwind CSS v3 -> v4 + gray classes to design tokens"
```

### Task 1.2: Install Nuxt UI v3, create `app.vue` with `<UApp>`, update config

**Files:**
- Modify: `package.json` (`@nuxt/ui@^3`)
- Modify: `assets/css/main.css` (add `@import "@nuxt/ui"`)
- Create: `app.vue`
- Modify: `layouts/default.vue`, `layouts/full-screen.vue` (remove `<UModals/>`, `<UNotifications/>`)
- Modify: `app.config.ts`

- [ ] **Step 1: Install Nuxt UI v3**
```bash
npm i @nuxt/ui@^3 tailwindcss
```
Expected: `@nuxt/ui` resolves to 3.x. `@nuxt/icon` is bundled by Nuxt UI — you may remove `@nuxt/icon` from `nuxt.config.ts` `modules` (Nuxt UI registers it). Keep `@iconify-json/heroicons` (icons used are `i-heroicons-*`).

- [ ] **Step 2: Import Nuxt UI in CSS**

Edit `assets/css/main.css`:
```css
@import "tailwindcss";
@import "@nuxt/ui";
```

- [ ] **Step 3: Create `app.vue` wrapping `<UApp>`**

`<UApp>` provides the toast/tooltip/overlay context that replaces `<UNotifications>`/`<UModals>`. The app previously relied on the auto-generated `app.vue`; create an explicit one:

Create `app.vue`:
```vue
<template>
  <UApp>
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```
> Note: `layouts/default.vue` currently renders `<NuxtLoadingIndicator/>` and `<NuxtPage/>` itself. Move `<NuxtPage/>` rendering to the layout's `<slot/>` model: confirm each layout wraps content in a `<slot />` (default.vue uses `<NuxtPage />` inside `<UContainer>`). Change layouts to use `<slot />` instead of `<NuxtPage />` since `app.vue` now owns `<NuxtLayout><NuxtPage/></NuxtLayout>`. Read both layouts and adjust: replace their inner `<NuxtPage />` with `<slot />`, and remove their top-level `<NuxtLoadingIndicator />` (now in app.vue).

- [ ] **Step 4: Remove the global overlay components from layouts**

In `layouts/default.vue` and `layouts/full-screen.vue`, delete the `<UModals />` and `<UNotifications />` lines. Toasts now render via `<UApp>`.

- [ ] **Step 5: Update `app.config.ts` colors + global input width**

Replace `app.config.ts` with:
```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'lime',
      neutral: 'neutral',
    },
    // Nuxt UI v3 form inputs are inline-flex (not full-width) by default.
    // Set width once globally instead of adding w-full to every input.
    input: { slots: { root: 'w-full' } },
    inputMenu: { slots: { root: 'w-full' } },
    textarea: { slots: { root: 'w-full' } },
    select: { slots: { base: 'w-full' } },
    selectMenu: { slots: { base: 'w-full' } },
  },
})
```

- [ ] **Step 6: Typecheck / build to surface the next wave of errors**
```bash
npm run typecheck
npm run build
```
Expected: FAILS with errors about renamed components/props (`UFormGroup`, `UToggle`, etc.) — that's the roadmap for Tasks 1.3–1.6. Do not try to fix everything here.

- [ ] **Step 7: Commit the scaffolding**
```bash
git add -A
git commit -m "phase1: install Nuxt UI v3, add app.vue <UApp>, update app.config colors"
```

### Task 1.3: Rename components (FormGroup/Toggle/Divider)

**Files:** all `.vue` using the renamed tags.

- [ ] **Step 1: Rename `UFormGroup` → `UFormField` (21 occurrences)**
```bash
grep -rln "UFormGroup" components pages layouts
```
In each file, replace `<UFormGroup` → `<UFormField` and `</UFormGroup>` → `</UFormField>`. The `label`, `name`, `description`, `help`(→`description`) props carry over; if any use `help=`, rename to `description=`.

- [ ] **Step 2: Rename `UToggle` → `USwitch` (5 occurrences)**
```bash
grep -rln "UToggle" components pages layouts
```
Replace `<UToggle` → `<USwitch`, `</UToggle>` → `</USwitch>` (self-closing in most cases). `v-model` carries over.

- [ ] **Step 3: Rename `UDivider` → `USeparator` (1 occurrence)**
```bash
grep -rln "UDivider" components pages layouts
```
Replace tag name; `label`/`icon` props carry over.

- [ ] **Step 4: Typecheck**
```bash
npm run typecheck
```
Expected: the FormGroup/Toggle/Divider errors are gone (other v3 errors remain).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "phase1: rename UFormGroup->UFormField, UToggle->USwitch, UDivider->USeparator"
```

### Task 1.4: Fix color props and toast colors

**Files:** `layouts/default.vue`, `components/notifications.vue`, and every file passing `color=` to a Nuxt UI component, plus every `toast.add({ color: 'red' })`.

- [ ] **Step 1: Map component `color` props**

Find them:
```bash
grep -rn 'color="\(white\|gray\|black\|lime\|red\)"' components pages layouts
```
Apply:

| v2 | v3 |
|---|---|
| `color="lime"` | `color="primary"` |
| `color="white"` | `color="neutral" variant="outline"` |
| `color="gray"` | `color="neutral"` (add `variant="subtle"` if it was a filled gray) |
| `color="black"` | `color="neutral"` |
| `color="red"` | `color="error"` |

- [ ] **Step 2: Map toast colors**
```bash
grep -rn "color: *['\"]red['\"]" components pages layouts composable
```
Replace `color: 'red'` → `color: 'error'` in every `toast.add(...)` (≈10 sites: `twitter-settings.vue`, `post.vue` ×2, `mastodon-settings-update.vue`, `map-settings.client.vue`, `user-update.vue` ×2, `notifications.vue`, `blue-sky-settings-update.vue`, `settings.vue`). Also change `useToast` `timeout:` → `duration:` if any exist:
```bash
grep -rn "timeout:" components pages layouts composable
```

- [ ] **Step 3: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: color-related errors gone.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "phase1: migrate color props and toast colors to v3 aliases"
```

### Task 1.5: Fix props/slots API changes (Select, Pagination, Tooltip, Popover, RadioGroup, Table, Form types)

**Files:** `pages/reports/index.vue`, `components/report-form.vue`, `layouts/default.vue`, the 5 `#ui/types` importers, any `USelectMenu`/`USelect`/`UTable`/`UPagination`/`UTooltip`/`UPopover` users, the 10 `:ui=` files.

- [ ] **Step 1: Select / SelectMenu — `options`→`items`, attributes, search**
```bash
grep -rn "USelectMenu\|USelect\b\|:options\|option-attribute\|searchable" components pages layouts
```
Apply per the v3 guide:
- `:options="x"` → `:items="x"`
- `option-attribute="name"` → `label-key="name"` (and `value-attribute`→`value-key` if present)
- `USelectMenu`: add `:search-input="false"` to preserve v2 no-search behavior unless search is desired
- `USelect`/`USelectMenu` `@change="fn"` (value handler) → `@update:model-value="fn"`. In `pages/reports/index.vue` the filter select uses `@change="() => (page = 1)"` — that resets the page and is fine as `@update:model-value`.

- [ ] **Step 2: Pagination — `v-model`→`v-model:page`, `page-count`→`items-per-page`**

In `pages/reports/index.vue`:
```diff
- <UPagination v-model="page" :page-count="limit" :total="unreviewedReports.count" class="justify-center" />
+ <UPagination v-model:page="page" :items-per-page="limit" :total="unreviewedReports.count" class="justify-center" />
```

- [ ] **Step 3: Popover — `#panel`→`#content`, `popper`→`content` (layouts/default.vue nav dropdown)**
```diff
- <UPopover :popper="{ placement: 'bottom-end' }">
-   <UButton color="white" icon="i-heroicons-bars-3" class="m-2" />
-   <template #panel="{close}">
+ <UPopover :content="{ side: 'bottom', align: 'end' }">
+   <UButton color="neutral" variant="outline" icon="i-heroicons-bars-3" class="m-2" />
+   <template #content="{close}">
      ...menu...
-   </template>
+   </template>
</UPopover>
```
Also in that dropdown, the `link.click` item pattern must become `onClick` if it's rendered by a Nuxt UI `items` API — but here it's a hand-rolled `v-for` calling `link.click()` directly, so leave the JS as-is (it's not the Nuxt UI items API). Just confirm `authedDropdown` still works.

- [ ] **Step 4: Tooltip — `popper`→`content`, `shortcuts`→`kbds` (if any)**
```bash
grep -rn "UTooltip\|:popper\|:shortcuts" components pages layouts
```
Apply `:popper="{ placement: 'top' }"` → `:content="{ side: 'top' }"`, `:shortcuts` → `:kbds`.

- [ ] **Step 5: RadioGroup — `options`→`items`, drop `:ui-radio` (components/report-form.vue)**
```diff
- <URadioGroup
-   class="mt-2"
-   v-model="formState.passenger"
-   :ui="{ fieldset: 'flex flex-row justify-between gap-4' }"
-   :ui-radio="{ wrapper: 'border border-solid border-gray-700 rounded-md p-2' }"
-   :options="[{ label: 'Yes', value: true }, { label: 'No', value: false }]"
- />
+ <URadioGroup
+   class="mt-2"
+   v-model="formState.passenger"
+   :ui="{ fieldset: 'flex flex-row justify-between gap-4', item: 'border border-solid border-default rounded-md p-2' }"
+   :items="[{ label: 'Yes', value: true }, { label: 'No', value: false }]"
+ />
```
> Verify the exact v3 RadioGroup slot names via `nuxt-ui` MCP `get-component radio-group` (the `item` slot key may differ); adjust `:ui` keys to match. Keep it minimal — do not add classes for pixel parity.

- [ ] **Step 6: Table — `rows`→`data`, columns, cell slots (if UTable is used)**
```bash
grep -rn "UTable" components pages layouts
```
For the single `UTable`, apply: `:rows`→`:data`; column defs `{ label, key }`→`{ header, accessorKey }`; row cell slots `#<key>-data`→`#<key>-cell`. Read the file and transform its specific columns. (TanStack Table under the hood in v3.)

- [ ] **Step 7: `:ui=` slot renames (10 files)**
```bash
grep -rln ":ui=" components pages layouts
```
For each `:ui={...}`, the v2 keys (e.g. `font`, `wrapper`, `container`, `base`) map to the component's new **slot** names. Fetch each component's theme via `nuxt-ui` MCP `get-component <name>` (see its `slots`) and rename keys. Remove v2-only keys like `strategy`. Keep overrides minimal (clean-code rule).

- [ ] **Step 8: `#ui/types` imports (6 files)**
```bash
grep -rn "#ui/types" components pages layouts composable
```
- `FormSubmitEvent` (5 files) — still exported; change import to `import type { FormSubmitEvent } from '@nuxt/ui'`.
- `Form` (`components/report-form.vue`) — the ref type is now `FormInstance`. Change:
```diff
- import type { Form } from "#ui/types";
+ import type { Form as FormInstance } from '@nuxt/ui'
...
- const form = ref<Form<ReportPostSchema>>();
+ const form = ref<FormInstance<ReportPostSchema>>()
```
> Verify the exact exported type name via `nuxt-ui` MCP `search-composables` / component `form` docs; if `Form<T>` is still exported from `@nuxt/ui`, keep that name.

- [ ] **Step 9: Form validation `path`→`name` (if custom validate functions exist)**
```bash
grep -rn "path:" components pages | grep -i "error\|validate"
```
In any `validate()` returning `{ path, message }`, rename `path` → `name`.

- [ ] **Step 10: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: no type errors. Fix any stragglers using the v3 guide.

- [ ] **Step 11: Commit**
```bash
git add -A
git commit -m "phase1: migrate component props/slots/types to v3 API"
```

### Task 1.6: Rewrite the programmatic modal (useModal → useOverlay)

**Files:** `pages/reports/index.vue`, `components/post-modal.vue`.

**Interfaces:**
- `PostModal` now emits `close(payload?: { success?: boolean })` and no longer takes `onClose`/`onSuccess` callbacks.

- [ ] **Step 1: Restructure `components/post-modal.vue` for v3**

v3 `UModal` renders content in the `#content` (or `#body`) slot; the overlay is controlled by `useOverlay`. The child `post` emits `close`/`success`; convert those into a single `close` event carrying the result.

Replace `components/post-modal.vue`:
```vue
<template>
  <UModal :ui="{ content: 'items-start' }">
    <template #content>
      <post
        :report="props.report"
        @close="emit('close')"
        @success="emit('close', { success: true })"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema'

const props = defineProps<{ report: SelectReport }>()
const emit = defineEmits<{ close: [payload?: { success?: boolean }] }>()
</script>
```
> Verify the `content` slot ui key against `nuxt-ui` MCP `get-component modal`. The v2 `{ strategy:'merge', container:'items-start' }` is removed; `items-start` moves to the relevant slot.

- [ ] **Step 2: Rewrite the opener in `pages/reports/index.vue`**

Replace the `useModal` block and `openPostModel`:
```diff
- const modal = useModal();
+ const overlay = useOverlay();
+ const postModal = overlay.create(PostModal);
```
```diff
- async function openPostModel(row: SelectReport) {
-   modal.open(PostModal, {
-     report: row,
-     async onClose() { return modal.close(); },
-     async onSuccess() {
-       return Promise.all([refreshReports(), refreshBroadcasts(), modal.close()]);
-     },
-   });
- }
+ async function openPostModel(row: SelectReport) {
+   const instance = postModal.open({ report: row });
+   const result = await instance.result;
+   if (result?.success) {
+     await Promise.all([refreshReports(), refreshBroadcasts()]);
+   }
+ }
```
> `overlay.create(PostModal)` returns a reusable handle; `.open({ report })` passes props and returns an instance whose `.result` resolves to the payload emitted with `close`. Confirm the exact `useOverlay` API shape via `nuxt-ui` MCP `search-composables useOverlay` (some versions use `overlay.create(Comp, { props })` then `.open()`; adjust `.open({ report })` vs `.open({ props: { report } })` accordingly).

- [ ] **Step 3: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: green.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "phase1: rewrite report approve modal with useOverlay"
```

### Task 1.7: Regenerate snapshots and run the full Phase-1 gate

**Files:** `components/report-card.test.ts` (snapshot), any other snapshot.

- [ ] **Step 1: Regenerate vitest snapshots (USkeleton markup changed in v3)**
```bash
npm run test:update
```
Then **review the snapshot diff** — the `report-card` skeleton HTML/classes will differ (v3 skeleton uses different markup/tokens). Confirm the change is purely presentational (still a skeleton, same structure), not a behavior regression.

- [ ] **Step 2: Fix component-test selectors if needed**

Run:
```bash
npm run test
```
If `findComponent(ReportSummary|ReportForm)` or id-based finds fail, read the component and restore stable ids/emit names (ids like `#report-card-approve`, `#post-dismiss-button` should be untouched by the UI migration). Fix and re-run until green.

- [ ] **Step 3: Run the complete gate**
```bash
npm run typecheck && npm run test && npm run build && npm run test:e2e
```
Expected: all green. If an E2E selector broke due to v3 DOM changes (e.g. toggle now `role="switch"`), update the spec selector (the Phase-0 specs were written to tolerate both).

- [ ] **Step 4: Manual click-through (spec §7 matrix)**

Start the dev server and manually verify each page/form once (Andy assists with passkey where the virtual authenticator isn't used):
```bash
npm run dev
```
Check: home report form (agency→route/stop selects, radio, submit), reports list (filter, pagination, **approve modal**, dismiss), settings (switches + integration forms + toasts), sign-in/sign-up (passkey), invite. Accept minor px differences.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "phase1: regenerate snapshots; Nuxt UI v3 gate green"
```

---

# PHASE 2 — Nuxt 3 → Nuxt 4

Goal: move the framework to Nuxt 4 while Nuxt UI stays on v3. Full reference: `https://nuxt.com/docs/4.x/getting-started/upgrade`.

### Task 2.1: Compat checkpoint, upgrade Nuxt, run migration recipe

**Files:** `package.json`, `nuxt.config.ts`.

- [ ] **Step 1: Confirm Nuxt UI v3 supports Nuxt 4**

Check the installed `@nuxt/ui` version and its Nuxt peer range:
```bash
npm ls @nuxt/ui
npm view @nuxt/ui@latest peerDependencies
```
If the installed 3.x predates Nuxt 4 support, bump to the newest 3.x first:
```bash
npm i @nuxt/ui@^3
```
(Do NOT jump to `@nuxt/ui@4` yet — that's Phase 3.)

- [ ] **Step 2: Upgrade Nuxt to v4**
```bash
npx nuxt upgrade
```
Expected: `nuxt` moves to 4.x in `package.json`; lockfile updated. Review the changes.

- [ ] **Step 3: Run the Nuxt 4 migration recipe codemod**
```bash
npx codemod nuxt/4/migration-recipe
```
Expected: applies the bundle of automated Nuxt 4 migrations. Review its diff.

- [ ] **Step 4: Set the compatibility date (already `2024-12-25`; bump to today's Nuxt 4 default if the tool suggests)**

Confirm `nuxt.config.ts` still has a `compatibilityDate`. Leave existing modules intact.

- [ ] **Step 5: Commit (may not build yet — dir move is next)**
```bash
git add -A
git commit -m "phase2: npx nuxt upgrade + nuxt/4 migration recipe"
```

### Task 2.2: Adopt the `app/` directory structure

**Files:** moves `assets/`, `components/`, `layouts/`, `middleware/`, `plugins/`, `pages/`, `composable/`, `app.vue`, `error.vue`, `app.config.ts` → `app/`. Keeps `server/`, `shared/`, `public/`, `db/`, `nuxt.config.ts` at root.

- [ ] **Step 1: Run the file-structure codemod**
```bash
npx codemod nuxt/4/file-structure
```
Expected: creates `app/` and moves the client dirs/files into it. Review carefully.

- [ ] **Step 2: Handle the non-standard `composable/` (singular) directory**

Nuxt auto-imports from `composables/` (plural). This repo uses `composable/` (singular). Check how it's currently resolved:
```bash
grep -rn "composable/" nuxt.config.ts app server components pages 2>/dev/null
grep -rn "from ['\"].*composable/" app 2>/dev/null
```
- If files import from it explicitly (e.g. `~/composable/config`), the codemod moved it to `app/composable/` and the `~` alias (now → `app/`) keeps those imports working — verify.
- If it relied on auto-import, rename `app/composable` → `app/composables` and drop explicit imports. Choose the option that keeps current behavior; verify with typecheck.

- [ ] **Step 3: Fix the CSS path**

`main.css` moved to `app/assets/css/main.css`. The `css: ['~/assets/css/main.css']` in `nuxt.config.ts` still resolves because `~` now points at `app/`. Confirm:
```bash
ls app/assets/css/main.css
```

- [ ] **Step 4: Verify aliases / `#components` / server boundary**

Run:
```bash
npm run typecheck
```
Fix import errors: `~`/`@` now point to `app/`; `server/` stays root; `shared/` stays root (imported via `#shared` or relative). The tests import `../db/schema` and `#components` — `db/` stays at root, so component tests that moved into `app/components/` need their relative `../db/schema` path checked (may become `../../db/schema`). Adjust relative paths broken by the move.

- [ ] **Step 5: Build**
```bash
npm run build
```
Expected: succeeds with the new structure.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "phase2: adopt Nuxt 4 app/ directory structure"
```

### Task 2.3: Fix Nuxt 4 data-fetching behavior

**Files:** `pages/reports/index.vue` and any `useAsyncData`/`useFetch`/`useLazyFetch` caller.

- [ ] **Step 1: Find all data-fetching calls**
```bash
grep -rn "useAsyncData\|useLazyFetch\|useFetch\|useState" app server
```

- [ ] **Step 2: Audit shallowRef reactivity**

In Nuxt 4, `data` is a `shallowRef` — mutating nested properties won't trigger updates; only whole-object replacement does. `pages/reports/index.vue` reads `unreviewedReports.result`/`.count` and replaces via `refresh()`, which is fine. If any code mutates `data.value.xxx` in place, add `{ deep: true }` to that call, or refactor to replace the whole value. Run the codemod to auto-annotate where inferable:
```bash
npx codemod nuxt/4/shallow-function-reactivity
```

- [ ] **Step 3: Fix `pending`→`status` usage**
```bash
grep -rn "pending" app
```
Replace `!pending` truthiness with `status === 'success'` / `status === 'pending'` where used for rendering. (If none, skip.)

- [ ] **Step 4: Dedupe option codemod (if `refresh({ dedupe: bool })` exists)**
```bash
npx codemod nuxt/4/deprecated-dedupe-value
```

- [ ] **Step 5: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: green.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "phase2: adapt data fetching to Nuxt 4 (shallowRef/status)"
```

### Task 2.4: TypeScript config, component-name tests, module compatibility

**Files:** `tsconfig.json`, `server/tsconfig.json`, `package.json` (module bumps only if needed).

- [ ] **Step 1: Reconcile tsconfig**

Nuxt 4 makes `noUncheckedIndexedAccess` a default and splits generated tsconfigs. Remove the now-redundant override in `tsconfig.json`:
```diff
{
  "extends": "./.nuxt/tsconfig.json",
- "compilerOptions": {
-   "noUncheckedIndexedAccess": true
- }
}
```
If `npm run typecheck` (which runs `nuxi typecheck`) now needs a project-reference build, follow the tool's guidance (it may switch to `vue-tsc -b`). Verify:
```bash
npm run typecheck
```

- [ ] **Step 2: Verify component-name normalization didn't break tests**

Nuxt 4 normalizes component names. The component tests use `findComponent(ReportSummary)`, `findComponent(ReportForm)` imported from `#components` (component *references*, not name strings), so they should still resolve. Run:
```bash
npm run test
```
If a `findComponent` fails, switch to the imported component reference (already used) or update to the normalized name. Fix until green.

- [ ] **Step 3: Verify every module loads on Nuxt 4 (bump only if blocking)**

Start the dev server and watch for module warnings/errors:
```bash
npm run dev
```
Watch console for failures from: `nuxt-auth-utils`, `nuxt-authorization`, `nuxt-cron`, `nuxt-rate-limit`, `@nuxtjs/device`, `@nuxt/icon` (if still listed), `@nuxt/test-utils`, `@nuxt/devtools`. For any that error, bump just that one to its latest and re-check:
```bash
npm i <module>@latest
```
Confirm auth (passkey), rate limiting, cron registration, and device detection still work.

- [ ] **Step 4: Full gate**
```bash
npm run typecheck && npm run test && npm run build && npm run test:e2e
```
Expected: all green.

- [ ] **Step 5: Manual click-through (spec §7 matrix)** — same as Task 1.7 Step 4.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "phase2: tsconfig + module compat; Nuxt 4 gate green"
```

---

# PHASE 3 — Nuxt UI v3 → v4

Goal: finish on Nuxt UI v4 (requires Nuxt 4, now satisfied). Full reference: `https://ui.nuxt.com/docs/getting-started/migration/v4`.

### Task 3.1: Upgrade to Nuxt UI v4 and apply v4 changes

**Files:** `package.json`, `app/assets/css/main.css`, `app/components/*` (ButtonGroup), `app/app.config.ts`.

- [ ] **Step 1: Install Nuxt UI v4**
```bash
npm i @nuxt/ui@^4 tailwindcss
```
Expected: `@nuxt/ui` resolves to 4.x.

- [ ] **Step 2: Rename `UButtonGroup` → `UFieldGroup` (1 occurrence)**
```bash
grep -rln "UButtonGroup" app
```
Replace `<UButtonGroup` → `<UFieldGroup` and the closing tag.

- [ ] **Step 3: Check `v-model.nullify` / model modifiers (likely none)**
```bash
grep -rn "\.nullify\|modelModifiers" app
```
If found on Input/InputNumber/Textarea, rename `nullify` → `nullable`.

- [ ] **Step 4: Review Form v4 behavior changes**

In v4, schema transforms apply only to `@submit` data (they no longer mutate form state), and nested forms need explicit `nested` + `name`. Review `app/components/report-form.vue` and the settings forms:
```bash
grep -rln "<UForm" app
```
- Confirm none rely on the schema *mutating* `state` (this app validates with zod but reads state directly — verify no `.transform()` output is read from state).
- Confirm there are no nested `<UForm>` inside another `<UForm>` (grep shows 6 forms; verify none nest). If any nest, add `nested` + `name`.

- [ ] **Step 5: Confirm the `@source`/CSS import is correct for `app/`**

`app/assets/css/main.css` should be:
```css
@import "tailwindcss";
@import "@nuxt/ui";
```
No `@nuxt/ui-pro` import (not used). If any `@source` directive references content dirs, ensure paths match the `app/` layout.

- [ ] **Step 6: Typecheck + build**
```bash
npm run typecheck && npm run build
```
Expected: green. Fix any v4 stragglers via the v4 guide.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "phase3: upgrade to Nuxt UI v4 (UButtonGroup->UFieldGroup, form review)"
```

### Task 3.2: Final full gate and manual verification

- [ ] **Step 1: Run the complete gate**
```bash
npm run typecheck && npm run test && npm run build && npm run test:e2e
```
Expected: all green. Regenerate snapshots with `npm run test:update` only if v4 changed component markup again — review the diff.

- [ ] **Step 2: Manual click-through (spec §7 matrix)** — same as Task 1.7 Step 4. Andy gives visual sign-off (minor px differences acceptable).

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "phase3: Nuxt UI v4 gate green"
```

---

# FINALIZE

### Task 4.1: Merge `upgrade` into `main`

- [ ] **Step 1: Rebase/refresh against main and re-run the gate**
```bash
git fetch origin
git rebase origin/main         # or merge; resolve any conflicts
npm ci
npm run typecheck && npm run test && npm run build && npm run test:e2e
```
Expected: green after rebase.

- [ ] **Step 2: Merge to main (only after Andy's sign-off)**
```bash
git checkout main
git merge --no-ff upgrade -m "Upgrade Nuxt 3->4 and Nuxt UI 2->4"
```
Do not push until Andy confirms (per repo rule: push only when asked).

- [ ] **Step 3: Clean up**
```bash
git branch -d upgrade   # after merge confirmed
git tag -d pre-upgrade-baseline   # optional
```
Remove the temporary planning worktree if still present:
```bash
git worktree list
git worktree remove .claude/worktrees/nuxt-ui-upgrade-plan-a30de8   # if listed
```

---

## Self-Review (author checklist — completed)

**Spec coverage:** Phase 0 ↔ spec §6 Phase 0 + §7 (E2E/passkey/manual). Phase 1 ↔ spec §6 Phase 1 (Tailwind v4, app.vue/UApp, renames, color/toast, props/slots/types, modal, snapshots). Phase 2 ↔ spec §6 Phase 2 (`npx nuxt upgrade`, codemods, app/ dir, data-fetch, tsconfig, module compat). Phase 3 ↔ spec §6 Phase 3 (UI v4, ButtonGroup→FieldGroup, form v4). §5 branch/worktree rules ↔ Task 0.1 + Global Constraints + Task 4.1. §10 decisions (one branch, local gate) ↔ Global Constraints + Finalize.

**Placeholder scan:** The only author-supplied assertion is Task 0.4 Step 1's `TODO-on-write` line, which is explicitly scoped (assert one stable element from `index.vue`) — not an open-ended placeholder. All migration transforms include exact commands and mapping tables. A few steps say "verify the exact slot/API name via the `nuxt-ui` MCP" — this is deliberate: v3/v4 slot keys must be confirmed against the installed version rather than guessed, and the step names the exact tool + component to query.

**Type consistency:** `PostModal` emits `close(payload?: { success?: boolean })` in Task 1.6 Step 1 and is consumed via `instance.result` → `result?.success` in Step 2. `FormInstance`/`Form<T>` naming flagged for confirmation against `@nuxt/ui`. Branch name `upgrade`, E2E env `.env.e2e`, DB `db/data/local-e2e.db`, storageState `test/e2e/.auth/user.json`, and script `test:e2e` are used consistently across tasks.
