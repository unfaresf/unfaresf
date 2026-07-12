# Nuxt & Nuxt UI Major-Version Upgrade — Design

**Date:** 2026-07-11
**Status:** Approved design → ready for implementation plan
**Author:** Andy McCoy (with Claude)

---

## 1. Goal

Bring the two most important framework dependencies up to their latest major
releases, one major at a time, verifying the app still works after each step:

- `@nuxt/ui`: **2.22.3 → 4.x** (two majors)
- `nuxt`: **3.21.8 → 4.x** (one major)

The app currently works and the UI is correct. The upgrade must preserve all
existing behavior.

## 2. Current state (verified from the lockfile & code)

The original premise ("Nuxt is v2") was incorrect. The app is **already on Nuxt 3
/ Vue 3 / Vite 6**. The Nuxt 2→3 rewrite is done.

| Dependency | Installed | Latest major | Work |
|---|---|---|---|
| `nuxt` | 3.21.8 | 4.x | v3 → v4 (1 major) |
| `@nuxt/ui` | 2.22.3 | 4.x | v2 → v3 → v4 (2 majors) |
| `vue` | 3.5.39 | 3.x | none |
| `vite` | 6.4.3 | (bundled w/ Nuxt) | follows Nuxt |
| `tailwindcss` | 3.4.19 | 4.x | v3 → v4 (driven by Nuxt UI v3) |
| `drizzle-orm` / `drizzle-kit` | 0.43.1 / 0.31.10 | — | framework-agnostic; bump only if blocking |
| `nuxt-auth-utils` | 0.5.29 | — | verify Nuxt 4 compat |
| `nuxt-authorization` | 0.3.5 | — | verify Nuxt 4 compat |
| `nuxt-cron` | 1.8.0 | — | verify Nuxt 4 compat |
| `nuxt-rate-limit` | 1.2.0 | — | verify Nuxt 4 compat |
| `@nuxtjs/device` | 3.2.4 | — | verify Nuxt 4 compat |
| `@nuxt/test-utils` | 3.23.0 | — | verify Nuxt 4 compat |

**App surface** (what the migration must not break):
- **Pages (9):** `index`, `report`, `reports/index`, `reports/[id]`, `settings`,
  `sign-in`, `sign-up`, `invite`, `thank-you`.
- **Layouts (2):** `default`, `full-screen` (both render `<UNotifications />`; nav
  uses hand-rolled class strings because "nuxt-ui `<ULink>` prefetch is broken" in v2).
- **Components (~20):** including forms, a map (`maplibre-gl` / `@indoorequal/vue-maplibre-gl`),
  a programmatic modal, and push notifications.
- **Server:** ~30 Nitro API routes, 3 cron pollers/posters, two SQLite DBs
  (app + GTFS) via `better-sqlite3` + Drizzle.
- **Auth:** `nuxt-auth-utils` with **WebAuthn / passkeys** (`auth.webAuthn: true`).
- **Tests:** vitest suite (`npm run test`), ~9 files across `nuxt` + `unit`
  environments, incl. 3 component tests. No E2E today. CI runs `npm run test`.

## 3. Constraints & principles

1. **Branches, not worktrees.** Each phase is done on its own git branch off
   `main` (e.g. `upgrade/nuxt-ui-v3`), committed, and merged (PR) before the next
   phase. Do **not** use git worktrees for the upgrade work.
2. **Clean code over pixel-perfect.** Small shifts in padding/margins/line widths
   (a few px) are acceptable. **Do not** add utility classes to chase pixel-perfect
   reproduction. Prefer Nuxt UI v3 **design tokens** (`text-muted`, `text-dimmed`,
   `text-highlighted`, `bg-muted`, `border-default`, …) and **global config**
   (`app.config.ts`) over per-element class bloat. Where a v2 workaround (e.g. the
   hand-rolled nav) can be simplified with a v3 component at low risk, prefer the
   simplification.
3. **Codemods first.** Use official codemods / upgrade tooling wherever they exist
   (`npx nuxt upgrade`, `npx @tailwindcss/upgrade`, `npx codemod nuxt/4/*`), then
   hand-fix the remainder.
4. **One major at a time.** Never combine two major upgrades in one commit.
5. **Green gate between phases.** A phase is "done" only when the full test gate
   (§7) passes and the change is committed.
6. **Secure context required.** WebAuthn/passkey needs HTTPS (the dev server is
   configured for HTTPS with local certs; `localhost` is also a secure context).
   All auth testing runs over HTTPS/localhost.

### Non-goals
- No Nuxt UI **Pro** adoption (though v4 makes Pro components free, we won't add them).
- No pixel-perfect visual reproduction.
- No proactive upgrade of unrelated deps (drizzle, etc.) unless a phase requires it.
- No feature changes; behavior-preserving refactors only.

## 4. Sequencing & version compatibility

Order: **Phase 1 (Nuxt UI v2→v3) → Phase 2 (Nuxt 3→4) → Phase 3 (Nuxt UI v3→v4).**

Rationale, from the official guides:
- Nuxt UI **v3 supports both Nuxt 3 and Nuxt 4.**
- Nuxt UI **v4 *requires* Nuxt 4** ("Nuxt UI v4 requires Nuxt 4 due to some dependencies").

So we upgrade Nuxt UI to v3 while still on Nuxt 3 (smaller blast radius, UI changes
isolated from framework changes), then move the framework to Nuxt 4 (UI stays on v3,
which supports it), then finish Nuxt UI on v4.

> **Compat checkpoint (before Phase 2):** confirm the pinned `@nuxt/ui@3.x` version
> supports Nuxt 4; if it predates Nuxt 4 support, bump to the newest 3.x first.

The alternatives (Nuxt 4 first while on UI v2; or combining UI v3 + Nuxt 4) were
rejected: UI v2 was not built for Nuxt 4, and combining majors makes failures hard
to bisect.

## 5. Git & delivery workflow

- **One long-lived branch** `upgrade` off `main`, merged to `main` once at the very
  end after all three phases pass. **No git worktrees.**
- **Start fresh outside any worktree.** This design was authored inside a git
  worktree; the implementation must be done in the primary checkout
  (`/Users/andy/projects/unfaresf`) on the `upgrade` branch. Do not modify code in a
  worktree. First step of execution: from the primary repo, `git checkout main &&
  git pull && git checkout -b upgrade`.
- Commit only when a step's gate is green. Use logically-grouped commits so a bad
  step is easy to revert. Suggested commit prefixes per phase:
  `phase0:`, `phase1:`, `phase2:`, `phase3:`.
- The Playwright E2E harness from Phase 0 lands first (on `upgrade`) and is reused by
  all phases.
- Verify locally at each gate: `npm run build` + Playwright E2E is sufficient (no
  staging deploy of the Docker image required before merge).

## 6. Phased plan

### Phase 0 — Baseline & test harness (prerequisite)

**Goal:** a known-green starting point and a reusable regression gate that works
over HTTPS and can exercise passkey-gated features.

1. `npm install`; capture a green baseline: `npm run test`, `npm run typecheck`
   (`nuxt typecheck`), `npm run build`. Fix or document anything already red.
2. Stand up **Playwright E2E** via `@nuxt/test-utils/e2e` (add `@playwright/test`).
   Run against an HTTPS dev server / `localhost` secure context so WebAuthn works.
3. **Passkey automation:** use Chromium's **CDP WebAuthn virtual authenticator**
   (`CDPSession.send('WebAuthn.enable')` + `addVirtualAuthenticator`) to register &
   assert a passkey without hardware. Seed a test user + credential in the test DB
   (`.env.test` already points at `db/data/local-test.db`). This automates the
   auth-gated flows (admin reports, settings, invite).
4. **Manual fallback checklist:** document a step-by-step manual test for every page
   and form (matrix in §7) to be used if virtual-authenticator automation proves too
   costly for a given flow. **Andy can assist** with real-passkey auth where needed.
5. Author smoke specs for the **public** routes first (`/`, `/report`, `/sign-in`,
   `/sign-up`, `/thank-you`), then the **auth-gated** routes using the virtual
   authenticator.
6. Commit on `test/e2e-baseline`; open PR; merge.

> Decision point recorded for execution: if the virtual-authenticator setup for a
> given auth flow costs more than its regression value, fall back to the manual
> checklist for that flow rather than over-investing. Revisit with Andy.

### Phase 1 — Nuxt UI v2 → v3 (largest change)

Branch: `upgrade/nuxt-ui-v3`. Brings **Tailwind v4** (CSS-first config), **Reka UI**
(replaces Headless UI), and **Tailwind Variants** theming.

**Tailwind v3 → v4**
- Create `assets/css/main.css` with `@import "tailwindcss";` (later `@import "@nuxt/ui";`),
  add `css: ['~/assets/css/main.css']` to `nuxt.config.ts`.
- Run `npx @tailwindcss/upgrade`.
- Replace the **~177 hardcoded `gray-*` classes** — prefer **design tokens**
  (`text-gray-500 dark:text-gray-400` → `text-muted`, `…-900 dark:…-white` →
  `text-highlighted`, etc.), which also *removes* classes. Fall back to
  `gray-*` → `neutral-*` only where no token maps cleanly.

**Install & wrap**
- `npm i @nuxt/ui@^3`; add `@import "@nuxt/ui";` to `main.css`.
- **Create `app.vue`** (none exists today) wrapping `<UApp>` around
  `<NuxtLoadingIndicator/>` + `<NuxtLayout><NuxtPage/></NuxtLayout>`. `<UApp>`
  provides the toaster/tooltip/overlay context.
- Remove `<UModals />` and `<UNotifications />` from `layouts/default.vue` and
  `layouts/full-screen.vue`.

**Config**
- `app.config.ts`: `ui: { primary: 'lime', gray: 'neutral' }` →
  `ui: { colors: { primary: 'lime', neutral: 'neutral' } }`.
- Add global input width once (avoids per-input `w-full` bloat):
  `ui: { input: { slots: { root: 'w-full' } }, select: { slots: { base: 'w-full' } }, selectMenu: { slots: { base: 'w-full' } } }` (and textarea/inputMenu as needed).

**Renamed components** (counts from current code)
- `UFormGroup` → `UFormField` (×21)
- `UToggle` → `USwitch` (×5)
- `UDivider` → `USeparator` (×1)

**Color props & toasts**
- `color="lime"` → `color="primary"`; `color="white"` → `color="neutral" variant="outline"`;
  `color="gray"` → `color="neutral"` (+ `variant="subtle"` where it was a solid gray).
- Toast `color: 'red'` → `color: 'error'` (~10 call sites across settings/post/notifications).

**Props / slots API changes** (per v3 guide, mapped to actual usage)
- `USelect` / `USelectMenu`: `:options` → `:items`; `option-attribute` →
  `label-key`/`value-key`; `USelectMenu` add `:search-input="false"` to preserve
  no-search behavior; `@change` now native — move value handling to
  `@update:model-value` (e.g. the `@change="() => (page = 1)"` filter in `reports/index.vue`).
- `UPagination`: `v-model` → `v-model:page`; `page-count` → `items-per-page`.
- `UTooltip`: `popper` → `content`, `shortcuts` → `kbds`.
- `UPopover`: `#panel` → `#content`, `popper` → `content` (used in `layouts/default.vue`
  nav dropdown — also convert `link.click` → `onClick`).
- `URadioGroup` (`report-form.vue`): `:options` → `:items`; drop `:ui-radio`;
  update `:ui` slot names.
- `UForm`: validation error key `path` → `name`; inputs no longer full-width by
  default (handled globally above, not per-input).
- `UTable` (1 use): `:rows` → `:data`, columns → `header`/`accessorKey`, cell slots
  `-data` → `-cell`.
- `useToast`: `timeout` → `duration`.
- `:ui=` prop overrides (10 files): rename to the new slot keys per component theme.
- Type imports (`#ui/types`): `FormSubmitEvent` (5 files) and `Form` (1 file) — update
  to the v3 type names/paths (`@nuxt/ui`).

**Programmatic modal rewrite** (`pages/reports/index.vue` + `components/post-modal.vue`)
- `useModal()` → `useOverlay()`; `modal.open(PostModal, { report, onClose, onSuccess })`
  → `overlay.create(PostModal, { props: { report } })` then `await instance.result`.
- `PostModal`: remove `:ui="{ strategy:'merge', … }"`; move content into `#content`/`#body`;
  emit `close(value)` instead of `onClose`/`onSuccess` callbacks; caller reacts to the
  awaited result (refresh reports/broadcasts on success).

**Opportunistic cleanup (low-risk, optional):** if v3 fixes the `<ULink>`/nav-prefetch
issue, replace the hand-rolled nav class strings in `layouts/default.vue` with
`UNavigationMenu`/`UButton` — only if it reduces code without risk.

**Gate:** `npm run typecheck`; **regenerate vitest snapshots** (`npm run test:update` —
the `report-card` skeleton HTML snapshot changes because `USkeleton` markup/classes
change) then `npm run test`; `npm run build`; E2E; manual checklist. Commit.

### Phase 2 — Nuxt 3 → Nuxt 4

Branch: `upgrade/nuxt-4`.

1. **Compat checkpoint:** ensure `@nuxt/ui` is on the newest 3.x that supports Nuxt 4.
2. `npx nuxt upgrade` (pulls Nuxt 4 + aligned Vite/Nitro). Run the migration recipe
   codemod: `npx codemod nuxt/4/migration-recipe`.
3. **Adopt the `app/` directory** via `npx codemod nuxt/4/file-structure`: move
   `assets/`, `components/`, `layouts/`, `middleware/`, `plugins/`, `pages/`, `app.vue`,
   `error.vue`, `app.config.ts` into `app/`; keep `server/`, `shared/`, `public/`,
   `nuxt.config.ts` at root. **Note the non-standard `composable/` (singular) dir** —
   verify how it's wired (Nuxt auto-imports `composables/`); rename/move deliberately.
   Update the `main.css` path to `app/assets/css/main.css`.
4. **Data fetching (Nuxt 4):** `data` from `useAsyncData`/`useFetch` is now `shallowRef`;
   audit mutation-in-place (`reports/index.vue` uses several `useLazyFetch`). Add
   `{ deep: true }` only where needed. Replace `!pending` logic with `status`-based
   checks. Apply `nuxt/4/shallow-function-reactivity` / `deprecated-dedupe-value`
   codemods where relevant.
5. **Normalized component names:** verify `findComponent(ReportSummary|ReportForm)` in
   the component tests still resolve (they import from `#components`, so likely fine).
6. **TypeScript:** Nuxt 4 splits tsconfig and makes `noUncheckedIndexedAccess` default —
   drop the manual setting in `tsconfig.json`; reconcile `server/tsconfig.json`; update
   typecheck to project-reference build if needed.
7. **Module compatibility (bump only if blocking):** verify against Nuxt 4 —
   `nuxt-auth-utils`, `nuxt-authorization`, `nuxt-cron`, `nuxt-rate-limit`,
   `@nuxtjs/device`, `@nuxt/icon`, `@nuxt/test-utils`, `@nuxt/devtools`. Upgrade any
   that fail to load or warn.
8. **Unhead v2:** remove any `vmid`/`hid` from meta (spot-check `nuxt.config.ts` head).
9. **Gate** (§7). Commit / PR / merge.

### Phase 3 — Nuxt UI v3 → v4

Branch: `upgrade/nuxt-ui-v4`.

1. `npm i @nuxt/ui@^4 tailwindcss`.
2. `UButtonGroup` → `UFieldGroup` (×1).
3. If any `v-model.nullify` on Input/Textarea → `.nullable` (grep; likely none).
4. **Form changes (v4):** schema transforms now apply only to `@submit` data (no state
   mutation); nested forms need explicit `nested` + `name`. Review `report-form.vue`
   and the settings forms for reliance on transform-mutates-state.
5. Ensure the Tailwind `@source` path matches the `app/` structure (from Phase 2).
6. Skip the AI-SDK section (not used).
7. **Gate** (§7). Commit / PR / merge.

## 7. Test plan (run at every phase gate)

**Automated gate:** `npm run typecheck` → `npm run test` (vitest) → `npm run build`
→ Playwright E2E smoke. CI (`npm run test`) must be green on each PR.

**Auth handling:** E2E runs over HTTPS/localhost. Auth-gated specs use the Chromium
CDP **virtual authenticator** with a seeded test credential. Where automation is
impractical, use the **manual, user-assisted** checklist (Andy assists with real
passkey). Every auth-gated feature must be exercised one way or the other.

**Coverage matrix — pages:**

| Page | Auth | What to verify |
|---|---|---|
| `/` (`index`) | public | report form: agency→route/stop selects, radio, submit path |
| `/report` | public | report submission flow |
| `/thank-you` | public | renders after submit |
| `/sign-in` | public | **passkey sign-in** (virtual authenticator) |
| `/sign-up` | public | invite-key gated sign-up + passkey registration |
| `/reports` | **auth** | reports list, status filter (`USelect`), pagination (`UPagination`), **approve modal** (`useOverlay`), dismiss |
| `/reports/[id]` | **auth** | single report view |
| `/settings` | **auth/admin** | integration toggles (`USwitch`), mastodon/bsky/twitter/user forms, save/error toasts |
| `/invite` | **auth/admin** | invite creation form |

**Coverage matrix — forms:** report-form (selects + radio + zod validation),
sign-in, sign-up, invite, settings integrations (mastodon/bsky/twitter/user-update),
map-settings. Verify: validation errors render (`UFormField`), success/error **toasts**
appear (moved to `<UApp>`), submit calls the right API.

**Also verify:** map renders (`routes-map`, `map-settings` — maplibre), push
notification enable/disable toggle, dark mode, PWA/service worker still registers.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Passkey auth can't be automated for some flow | CDP virtual authenticator; manual user-assisted fallback; Andy assists |
| `@nuxt/ui@3` ↔ Nuxt 4 compat | Compat checkpoint before Phase 2; pin newest 3.x |
| Small module breaks on Nuxt 4 (`nuxt-cron`, `nuxt-rate-limit`, …) | Verify each; bump only the broken one |
| Snapshot tests fail on v3 markup | Expected; regenerate with `test:update` and review the diff |
| `gray→token` sweep changes look too much | Clean-code preference accepts minor px shifts; review visually per phase |
| `app/` dir move breaks imports/aliases | Codemod + verify `~`/`#components`; the non-standard `composable/` dir needs manual care |
| Modal rewrite changes behavior | Covered by E2E approve-modal spec + manual check |

## 9. Where Andy's help is expected

- Confirming / assisting with real passkey auth if virtual-authenticator automation stalls.
- Providing any secrets needed for a full local run (VAPID keys, TLS cert paths) if
  E2E needs the real dev server rather than the test harness.
- Visual sign-off on each phase (accepting minor px differences).

## 10. Resolved decisions

- **Branch strategy:** one long-lived `upgrade` branch off `main`, all three phases
  committed to it, merged to `main` once at the end. (Not a PR per phase.)
- **Verification depth:** local `npm run build` + Playwright E2E is sufficient; no
  staging/Docker smoke-test required before merge.
