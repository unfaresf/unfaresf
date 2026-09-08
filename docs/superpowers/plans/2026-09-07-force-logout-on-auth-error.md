# Force logout on auth error (issue #237) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an API call fails because the session is gone, clear it and bounce the user to `/sign-in` (remembering where they were), instead of showing an empty error toast on a logged-in-looking UI.

**Architecture:** Server gets a `authorizeRequest` wrapper so "no session" throws **401** and "logged in but forbidden" stays **403**. A client `.client.ts` plugin overrides `globalThis.$fetch` with an `onResponseError` interceptor that force-logs-out on a non-exempt **401** only. A shared `useAuthRedirect` composable carries an `?redirect=` param through sign-in/sign-up with an open-redirect guard. Behaviour-bearing logic lives in small `app/composable/` helpers so it is unit-testable without mounting pages.

**Tech Stack:** Nuxt 4, Nitro, `nuxt-auth-utils` (sealed-cookie session), `nuxt-authorization` (ability checks), `@nuxt/ui` (`useToast`), Vitest + `@nuxt/test-utils` (unit, `environment: 'nuxt'`), Playwright (e2e).

**Spec:** `docs/specs/2026-09-07-issue-237-force-logout-on-auth-error.md` — read it alongside this plan.

## Global Constraints

- **401 = unauthenticated, 403 = forbidden.** Never force-logout on 403.
- **Exempt URL prefixes** (never trigger logout): `/api/_auth/`, `/api/webauthn/`. Match on the parsed **pathname**, never a substring of the raw URL.
- **Toast only when a real session died** (`wasLoggedIn === true`). Silent clear+redirect otherwise.
- **`?redirect=` guard**: accept only same-origin app-internal paths — must start `/`, must not start `//`, `/sign-in`, or `/sign-up`. Anything else → the caller's fallback.
- `allowGuest` abilities (`createReports`, public GETs) must keep working with no session.
- Match repo conventions: helpers go in `app/composable/` and are imported explicitly via `~/composable/<name>` (this repo does **not** use the auto-imported `composables/` dir). Server utils in `server/utils/` **are** Nitro auto-imported.
- Commit after every task. End each commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
  ```
- Gate commands: `npm run test` (vitest), `npm run typecheck`, `npm run test:e2e` (Playwright).

---

## File Structure

**New source**
| File | Responsibility |
|---|---|
| `server/utils/authorize-request.ts` | `authorizeRequest(event, ability, ...args)` — 401 for no-session, else delegate to ability check (403 on fail). |
| `app/composable/authErrorGuard.ts` | `isAuthExemptUrl()`, `handleApiAuthError(ctx)` — the force-logout decision + effects. |
| `app/plugins/api-auth-guard.client.ts` | Thin: `globalThis.$fetch = $fetch.create({ onResponseError: … })`. |
| `app/composable/useAuthRedirect.ts` | `useAuthRedirect(fallback?)` → `{ target(): string }` — the `?redirect=` guard. |
| `app/composable/apiErrorToast.ts` | `reportNonAuthError(response)` — the de-duped page error toast. |

**New tests**
| File | Covers |
|---|---|
| `test/unit/authorize-request.test.ts` | Task 1 |
| `test/unit/authorize-request-drift.test.ts` | Task 2 (no raw `authorize(event,` left) |
| `test/unit/useAuthRedirect.test.ts` | Task 3 |
| `test/nuxt/apiErrorToast.test.ts` | Task 5 |
| `test/nuxt/api-auth-guard.test.ts` | Task 7 + Task 8 |
| `test/e2e/session-expiry.auth.spec.ts` | Task 9 |

**Modified**
- 29 route handlers under `server/api/**` — swap `authorize(event,` → `authorizeRequest(event,` (Task 2).
- `app/pages/sign-in.vue`, `app/pages/sign-up.vue` — use `useAuthRedirect` (Task 4).
- `app/pages/settings.vue` (×2), `app/pages/reports/index.vue` (×1) — use `reportNonAuthError` (Task 6).

## Parallelisation (for subagent-driven execution)

- **Wave A — independent, run in parallel:** Task 1, Task 3, Task 5, Task 7
- **Wave B — each depends only on its Wave-A sibling, run in parallel:** Task 2 (needs 1), Task 4 (needs 3), Task 6 (needs 5), Task 8 (needs 7)
- **Wave C:** Task 9 (needs 2, 4, 8)
- **Wave D:** Task 10 (needs everything)

---

### Task 1: `authorizeRequest` server wrapper

**Files:**
- Create: `server/utils/authorize-request.ts`
- Test: `test/unit/authorize-request.test.ts`

**Interfaces:**
- Consumes: `authorize` (as `checkAbility`), `AuthorizationError`, `BouncerAbility`, `BouncerArgs` from `nuxt-authorization/utils`; `createError` from `h3`; real abilities from `shared/utils/abilities.ts`.
- Produces: `export async function authorizeRequest<Ability extends BouncerAbility<any>>(event: H3Event, ability: Ability, ...args: BouncerArgs<Ability>): Promise<void>` — throws `createError({ statusCode: 401 })` when `resolveServerUser()` is falsy and `!ability.allowGuest`; throws `createError({ statusCode: 403 })` (normalised `AuthorizationError`) when a present user fails the ability; resolves otherwise.

- [ ] **Step 1: Write the failing test**

Create `test/unit/authorize-request.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { authorizeRequest } from '../../server/utils/authorize-request';
import {
  listReports,
  createReports,
  getUsers,
  updateUsers,
} from '../../shared/utils/abilities';
import { Roles } from '../../db/schema';

type FakeUser = { id: number; roles: string[] };

function eventFor(user: FakeUser | null) {
  return {
    context: {
      $authorization: { resolveServerUser: async () => user },
    },
  } as any;
}

const admin: FakeUser = { id: 1, roles: [Roles.Admin] };
const editor: FakeUser = { id: 2, roles: [Roles.Editor] };

describe('authorizeRequest', () => {
  it('throws 401 when a protected ability has no session user', async () => {
    await expect(authorizeRequest(eventFor(null), listReports)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('resolves when a protected ability has a user that passes', async () => {
    await expect(authorizeRequest(eventFor(editor), listReports)).resolves.toBeUndefined();
  });

  it('throws 403 when a present user fails the ability', async () => {
    await expect(authorizeRequest(eventFor(editor), getUsers)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('does not throw 401 for an allowGuest ability with no user', async () => {
    await expect(authorizeRequest(eventFor(null), createReports)).resolves.toBeUndefined();
  });

  it('forwards extra args to the ability', async () => {
    // updateUsers(user, targetUserId): Admin editing another id is allowed,
    // editing own id is denied — proves the arg reached the ability.
    await expect(authorizeRequest(eventFor(admin), updateUsers, 999)).resolves.toBeUndefined();
    await expect(authorizeRequest(eventFor(admin), updateUsers, admin.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/authorize-request.test.ts`
Expected: FAIL — `Cannot find module '../../server/utils/authorize-request'` (or "authorizeRequest is not a function").

- [ ] **Step 3: Write minimal implementation**

Create `server/utils/authorize-request.ts`:

```ts
import type { H3Event } from 'h3';
import { createError } from 'h3';
import {
  authorize as checkAbility,
  AuthorizationError,
  type BouncerAbility,
  type BouncerArgs,
} from 'nuxt-authorization/utils';

/**
 * Like nuxt-authorization's server `authorize`, but throws 401 (not 403) when the
 * route requires a user and the request has no session, so the client can safely
 * force-logout on 401 only. Resolves the user via `event.context.$authorization`,
 * set by `server/plugins/authorization-resolver.ts`.
 */
export async function authorizeRequest<Ability extends BouncerAbility<any>>(
  event: H3Event,
  ability: Ability,
  ...args: BouncerArgs<Ability>
): Promise<void> {
  const user = await event.context.$authorization.resolveServerUser();

  if (!user && !ability.allowGuest) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' });
  }

  try {
    await checkAbility(ability, user ?? null, ...args);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      throw createError({ statusCode: err.statusCode, message: err.message });
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/authorize-request.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. If `BouncerArgs`/`BouncerAbility` don't resolve from `nuxt-authorization/utils`, confirm the subpath export exists in `node_modules/nuxt-authorization/package.json` (`"./utils"`) — it does; keep the `type` modifiers on those two imports.

- [ ] **Step 6: Commit**

```bash
git add server/utils/authorize-request.ts test/unit/authorize-request.test.ts
git commit -m "$(cat <<'EOF'
add authorizeRequest wrapper: 401 for no session, 403 for forbidden

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 2: Swap route handlers to `authorizeRequest` + drift guard

**Files:**
- Create: `test/unit/authorize-request-drift.test.ts`
- Modify (swap `authorize(event,` → `authorizeRequest(event,`, one call each):
  ```
  server/api/healthz.get.ts
  server/api/debug.get.ts
  server/api/invite.post.ts
  server/api/broadcasts/index.get.ts
  server/api/broadcasts/index.post.ts
  server/api/broadcasts/geo.get.ts
  server/api/gtfs/agencies.get.ts
  server/api/gtfs/directions/[routeId].get.ts
  server/api/gtfs/map/routes/[routeId].get.ts
  server/api/gtfs/map/stops/[stopId].get.ts
  server/api/gtfs/routes/index.get.ts
  server/api/gtfs/routes/[id].get.ts
  server/api/gtfs/stops/index.get.ts
  server/api/gtfs/stops/search.get.ts
  server/api/gtfs/stops/[id].get.ts
  server/api/integrations/index.get.ts
  server/api/integrations/index.post.ts
  server/api/integrations/map.get.ts
  server/api/integrations/[id].put.ts
  server/api/reports/index.get.ts
  server/api/reports/index.post.ts
  server/api/reports/[id].get.ts
  server/api/reports/[id].put.ts
  server/api/subscriptions/index.post.ts
  server/api/subscriptions/index.delete.ts
  server/api/subscriptions/[id].delete.ts
  server/api/users/index.get.ts
  server/api/users/[id].put.ts
  server/api/users/[id].delete.ts
  ```

**Interfaces:**
- Consumes: `authorizeRequest` from Task 1 (Nitro auto-import — no `import` line needed in handlers).
- Produces: nothing new; every `server/api/**` handler now returns **401** (not 403) for an unauthenticated caller on a protected route.

- [ ] **Step 1: Write the failing test**

Create `test/unit/authorize-request-drift.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/api');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = resolve(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const RAW_AUTHORIZE = /\bauthorize\s*\(\s*event\b/;

describe('no raw authorize(event, ...) left in server/api', () => {
  const files = walk(apiDir).filter((f) => f.endsWith('.ts'));

  it('scans a non-trivial number of handler files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    it(`${file.split('/server/api/')[1]} uses authorizeRequest`, () => {
      const src = readFileSync(file, 'utf8');
      expect(RAW_AUTHORIZE.test(src)).toBe(false);
    });
  }
});
```


- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/authorize-request-drift.test.ts`
Expected: FAIL — ~29 cases fail because handlers still call `authorize(event,`.

- [ ] **Step 3: Do the swap**

In each of the 29 files, replace the single occurrence of `authorize(event,` with `authorizeRequest(event,`. Leave the rest of the line (the ability, any extra args, the `// @ts-ignore` comment above it) untouched. Do **not** add an import line — `authorizeRequest` is Nitro-auto-imported from `server/utils/`.

`server/api/subscriptions/index.delete.ts` also has its own explicit `throw createError({ statusCode: 401 … })` earlier in the handler — leave that as-is; only swap its `authorize(event,` call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/authorize-request-drift.test.ts`
Expected: PASS (all files + the count guard).

- [ ] **Step 5: Full unit suite + typecheck**

Run: `npm run test`
Expected: PASS — existing route/component tests still green (401-vs-403 change doesn't break them; `user-update.test.ts`'s 403 case throws its own `createError`, not via the ability path).
Run: `npm run typecheck`
Expected: no new errors (confirms `authorizeRequest` auto-import resolves).

- [ ] **Step 6: Commit**

```bash
git add server/api test/unit/authorize-request-drift.test.ts
git commit -m "$(cat <<'EOF'
route handlers: authorize -> authorizeRequest so no-session returns 401

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 3: `useAuthRedirect` composable

**Files:**
- Create: `app/composable/useAuthRedirect.ts`
- Test: `test/unit/useAuthRedirect.test.ts`

**Interfaces:**
- Consumes: `useRoute` (Nuxt auto-import).
- Produces: `export function useAuthRedirect(fallback?: string): { target: () => string }` — `target()` returns `route.query.redirect` when it is a string starting `/`, not starting `//`, `/sign-in`, or `/sign-up`; otherwise `fallback` (default `'/reports'`).

- [ ] **Step 1: Write the failing test**

Create `test/unit/useAuthRedirect.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useAuthRedirect } from '../../app/composable/useAuthRedirect';

const { routeQuery } = vi.hoisted(() => ({ routeQuery: { value: {} as Record<string, unknown> } }));
mockNuxtImport('useRoute', () => () => ({ query: routeQuery.value }));

function withQuery(q: Record<string, unknown>) {
  routeQuery.value = q;
}

describe('useAuthRedirect', () => {
  it('returns a clean internal path', () => {
    withQuery({ redirect: '/reports/42' });
    expect(useAuthRedirect().target()).toBe('/reports/42');
  });

  it('falls back when redirect is absent', () => {
    withQuery({});
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects protocol-relative URLs', () => {
    withQuery({ redirect: '//evil.com' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects absolute URLs', () => {
    withQuery({ redirect: 'https://evil.com' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects loops back to auth pages', () => {
    withQuery({ redirect: '/sign-in' });
    expect(useAuthRedirect().target()).toBe('/reports');
    withQuery({ redirect: '/sign-up?foo=1' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects an array-valued redirect', () => {
    withQuery({ redirect: ['/a', '/b'] });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('honours a custom fallback', () => {
    withQuery({});
    expect(useAuthRedirect('/').target()).toBe('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/useAuthRedirect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/composable/useAuthRedirect.ts`:

```ts
// Resolves a safe post-auth destination from `?redirect=`. Accepts only
// same-origin, app-internal paths; rejects protocol-relative (`//host`), absolute
// URLs, and loops back to an auth page.
export function useAuthRedirect(fallback = '/reports') {
  const route = useRoute();

  function target(): string {
    const r = route.query.redirect;
    if (
      typeof r === 'string' &&
      r.startsWith('/') &&
      !r.startsWith('//') &&
      !r.startsWith('/sign-in') &&
      !r.startsWith('/sign-up')
    ) {
      return r;
    }
    return fallback;
  }

  return { target };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/useAuthRedirect.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composable/useAuthRedirect.ts test/unit/useAuthRedirect.test.ts
git commit -m "$(cat <<'EOF'
add useAuthRedirect: guarded ?redirect= target for post-auth navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 4: Wire `useAuthRedirect` into sign-in and sign-up

**Files:**
- Modify: `app/pages/sign-in.vue`
- Modify: `app/pages/sign-up.vue`
- Test: `test/nuxt/auth-pages-redirect.test.ts`

**Interfaces:**
- Consumes: `useAuthRedirect` from Task 3 (`import { useAuthRedirect } from '~/composable/useAuthRedirect'`).
- Produces: after a successful passkey auth, `sign-in.vue` navigates to `useAuthRedirect().target()` (fallback `/reports`); `sign-up.vue` navigates to `useAuthRedirect('/').target()` (fallback `/`).

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/auth-pages-redirect.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';

const { navigate, routeQuery, authenticate, register, sessionFetch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  routeQuery: { value: {} as Record<string, unknown> },
  authenticate: vi.fn(async () => ({})),
  register: vi.fn(async () => ({})),
  sessionFetch: vi.fn(async () => {}),
}));

mockNuxtImport('navigateTo', () => navigate);
mockNuxtImport('useRoute', () => () => ({ query: routeQuery.value }));
mockNuxtImport('useUserSession', () => () => ({ fetch: sessionFetch }));
mockNuxtImport('useWebAuthn', () => () => ({ authenticate, register }));
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }));

afterEach(() => {
  navigate.mockClear();
  authenticate.mockClear();
  register.mockClear();
  routeQuery.value = {};
});

describe('sign-in redirect', () => {
  it('navigates to ?redirect= target on success', async () => {
    routeQuery.value = { redirect: '/reports/7' };
    const page = await mountSuspended((await import('../../app/pages/sign-in.vue')).default);
    await page.find('button').trigger('click');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports/7');
  });

  it('falls back to /reports with no redirect', async () => {
    const page = await mountSuspended((await import('../../app/pages/sign-in.vue')).default);
    await page.find('button').trigger('click');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports');
  });
});

describe('sign-up redirect', () => {
  it('navigates to ?redirect= target on success', async () => {
    routeQuery.value = { redirect: '/reports/7' };
    const page = await mountSuspended((await import('../../app/pages/sign-up.vue')).default);
    page.find('input').setValue('newuser');
    await page.find('form').trigger('submit');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports/7');
  });

  it('falls back to / with no redirect', async () => {
    const page = await mountSuspended((await import('../../app/pages/sign-up.vue')).default);
    page.find('input').setValue('newuser');
    await page.find('form').trigger('submit');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nuxt/auth-pages-redirect.test.ts`
Expected: FAIL — `sign-in.vue` calls `navigateTo('/reports')` unconditionally (first test expects `/reports/7`), `sign-up.vue` calls `navigateTo('/')` unconditionally (its redirect test fails).

- [ ] **Step 3: Edit `sign-in.vue`**

In `<script setup>` add the import and composable, and use `target()` in the success branch.

Add near the other imports:
```ts
import { useAuthRedirect } from '~/composable/useAuthRedirect'
```
Add with the other `const`s (e.g. after `const toast = useToast()`):
```ts
const { target } = useAuthRedirect()
```
Change the success branch inside `signIn()`:
```ts
    .then(async () => {
      await navigateTo(target());
    })
```

- [ ] **Step 4: Edit `sign-up.vue`**

Add near the other imports:
```ts
import { useAuthRedirect } from '~/composable/useAuthRedirect'
```
Add with the other `const`s (after `const { query } = useRoute();`):
```ts
const { target } = useAuthRedirect('/')
```
Change the success line inside `signUp()`:
```ts
    await fetch();
    await navigateTo(target());
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/nuxt/auth-pages-redirect.test.ts`
Expected: PASS (4 tests). If `mountSuspended` on `sign-in.vue` fails to find a `button` (UAuthForm renders the provider button asynchronously), assert against `navigate` after calling the page's exposed `signIn` via `page.vm` instead — but try the DOM path first.

- [ ] **Step 6: Full unit suite + typecheck**

Run: `npm run test` then `npm run typecheck`
Expected: PASS, no new type errors.

- [ ] **Step 7: Commit**

```bash
git add app/pages/sign-in.vue app/pages/sign-up.vue test/nuxt/auth-pages-redirect.test.ts
git commit -m "$(cat <<'EOF'
sign-in/sign-up: honour ?redirect= via useAuthRedirect

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 5: `reportNonAuthError` toast helper

**Files:**
- Create: `app/composable/apiErrorToast.ts`
- Test: `test/nuxt/apiErrorToast.test.ts`

**Interfaces:**
- Consumes: `useToast` (Nuxt/@nuxt/ui auto-import).
- Produces: `export function reportNonAuthError(response: { status: number; _data?: any }): void` — no-op for status 401/403; otherwise `useToast().add({ color: 'error', title: 'Something went wrong', description: response._data?.message ?? response._data?.statusMessage ?? undefined })`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/apiErrorToast.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { reportNonAuthError } from '../../app/composable/apiErrorToast';

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));

afterEach(() => toastAdd.mockClear());

describe('reportNonAuthError', () => {
  it('stays silent on 401', () => {
    reportNonAuthError({ status: 401 });
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('stays silent on 403', () => {
    reportNonAuthError({ status: 403 });
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('shows a non-empty title on 500', () => {
    reportNonAuthError({ status: 500 });
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'error', title: 'Something went wrong' }),
    );
  });

  it('uses _data.message as the description when present', () => {
    reportNonAuthError({ status: 400, _data: { message: 'Bad thing' } });
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Bad thing' }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nuxt/apiErrorToast.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/composable/apiErrorToast.ts`:

```ts
// Shared handler for a page's per-fetch `onResponseError`. 401 is handled
// globally (force logout); 403 is the page's own concern; everything else gets a
// real, non-empty toast (HTTP/2 has no `statusText`, which is why the old
// `title: response.statusText` rendered blank).
export function reportNonAuthError(response: { status: number; _data?: any }): void {
  if (response.status === 401 || response.status === 403) return;
  useToast().add({
    color: 'error',
    title: 'Something went wrong',
    description: response._data?.message ?? response._data?.statusMessage ?? undefined,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/nuxt/apiErrorToast.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composable/apiErrorToast.ts test/nuxt/apiErrorToast.test.ts
git commit -m "$(cat <<'EOF'
add reportNonAuthError: real error toast for non-auth fetch failures

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 6: Route pages through `reportNonAuthError`

**Files:**
- Modify: `app/pages/settings.vue` (two `onResponseError` handlers)
- Modify: `app/pages/reports/index.vue` (one `onResponseError` handler)

**Interfaces:**
- Consumes: `reportNonAuthError` from Task 5 (`import { reportNonAuthError } from '~/composable/apiErrorToast'`).
- Produces: no empty toasts; 401/403 no longer double-handled by these pages.

- [ ] **Step 1: Add a regression assertion to the Task 5 suite**

Append to `test/nuxt/apiErrorToast.test.ts` — a check that the old empty-title shape is gone from the call sites:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

describe('call sites no longer toast response.statusText', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = [
    '../../app/pages/settings.vue',
    '../../app/pages/reports/index.vue',
  ];
  for (const rel of files) {
    it(`${rel} has no title: response.statusText`, () => {
      const src = readFileSync(resolve(here, rel), 'utf8');
      expect(src).not.toMatch(/title:\s*response\.statusText/);
    });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/nuxt/apiErrorToast.test.ts`
Expected: FAIL — both files still contain `title: response.statusText`.

- [ ] **Step 3: Edit `app/pages/settings.vue`**

Add with the imports in `<script setup>`:
```ts
import { reportNonAuthError } from '~/composable/apiErrorToast'
```
Replace **both** occurrences of:
```ts
  onResponseError({ response }) {
    toast.add({
      color: 'error',
      title: response.statusText
    });
  }
```
with:
```ts
  onResponseError({ response }) {
    reportNonAuthError(response);
  }
```
If `toast` is now unused in the file, remove its `const toast = useToast()` line; if still used elsewhere, leave it.

- [ ] **Step 4: Edit `app/pages/reports/index.vue`**

Add with the imports:
```ts
import { reportNonAuthError } from '~/composable/apiErrorToast'
```
Replace the one occurrence of:
```ts
    onResponseError({ response }) {
      toast.add({
        color: "error",
        title: response.statusText,
      });
    },
```
with:
```ts
    onResponseError({ response }) {
      reportNonAuthError(response);
    },
```
Leave the other `toast.add(...)` calls in this file (the `dismiss()` catch block) untouched — `toast` stays imported.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run test/nuxt/apiErrorToast.test.ts`
Expected: PASS.

- [ ] **Step 6: Full unit suite + typecheck**

Run: `npm run test` then `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/pages/settings.vue app/pages/reports/index.vue test/nuxt/apiErrorToast.test.ts
git commit -m "$(cat <<'EOF'
pages: use reportNonAuthError, kill empty statusText error toasts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 7: `authErrorGuard` — the force-logout handler

**Files:**
- Create: `app/composable/authErrorGuard.ts`
- Test: `test/nuxt/api-auth-guard.test.ts`

**Interfaces:**
- Consumes: `useUserSession`, `useToast`, `useRoute`, `navigateTo` (Nuxt auto-imports); `FetchContext` type from `ofetch`.
- Produces:
  - `export function isAuthExemptUrl(request: unknown, response?: Response): boolean`
  - `export async function handleApiAuthError(ctx: FetchContext): Promise<void>` — acts only on `ctx.response?.status === 401` for a non-exempt URL; dedupes concurrent calls with a module flag; `await clear()` (falling back to `session.value = null` on throw); toast **only if** `loggedIn.value` was true; `navigateTo({ path: '/sign-in', query: { redirect: route.fullPath } })` unless already on `/sign-in`.

- [ ] **Step 1: Write the failing test**

Create `test/nuxt/api-auth-guard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { handleApiAuthError, isAuthExemptUrl } from '../../app/composable/authErrorGuard';

const { state } = vi.hoisted(() => ({
  state: {
    loggedIn: true,
    routePath: '/reports',
    routeFullPath: '/reports?tab=new',
    clear: vi.fn(async () => {}),
    session: { value: { user: { id: 1 } } as any },
    toastAdd: vi.fn(),
    navigate: vi.fn(async () => {}),
  },
}));

mockNuxtImport('useUserSession', () => () => ({
  loggedIn: { value: state.loggedIn },
  clear: state.clear,
  session: state.session,
}));
mockNuxtImport('useToast', () => () => ({ add: state.toastAdd }));
mockNuxtImport('useRoute', () => () => ({ path: state.routePath, fullPath: state.routeFullPath }));
mockNuxtImport('navigateTo', () => state.navigate);

const ctx = (status: number | undefined, request: unknown = '/api/reports') =>
  ({ request, response: status === undefined ? undefined : ({ status, url: String(request) } as any) }) as any;

beforeEach(() => {
  state.loggedIn = true;
  state.routePath = '/reports';
  state.routeFullPath = '/reports?tab=new';
  state.session = { value: { user: { id: 1 } } };
  state.clear = vi.fn(async () => {});
  state.toastAdd.mockClear();
  state.navigate.mockClear();
});

describe('isAuthExemptUrl', () => {
  it('exempts the session + webauthn prefixes (string, Request, undefined)', () => {
    expect(isAuthExemptUrl('/api/_auth/session')).toBe(true);
    expect(isAuthExemptUrl(new Request('https://x.test/api/webauthn/authenticate'))).toBe(true);
    expect(isAuthExemptUrl('/api/reports')).toBe(false);
    expect(isAuthExemptUrl(undefined, { url: '/api/_auth/session' } as any)).toBe(true);
  });
  it('is not fooled by a query param', () => {
    expect(isAuthExemptUrl('/api/reports?foo=/api/_auth/x')).toBe(false);
  });
});

describe('handleApiAuthError', () => {
  it('logged-in 401: clears, toasts once, redirects with redirect=', async () => {
    await handleApiAuthError(ctx(401));
    expect(state.clear).toHaveBeenCalledTimes(1);
    expect(state.toastAdd).toHaveBeenCalledTimes(1);
    expect(state.navigate).toHaveBeenCalledWith({
      path: '/sign-in',
      query: { redirect: '/reports?tab=new' },
    });
  });

  it('never-authed 401: clears + redirects, no toast', async () => {
    state.loggedIn = false;
    await handleApiAuthError(ctx(401));
    expect(state.clear).toHaveBeenCalledTimes(1);
    expect(state.toastAdd).not.toHaveBeenCalled();
    expect(state.navigate).toHaveBeenCalled();
  });

  it('ignores 401 on exempt urls', async () => {
    await handleApiAuthError(ctx(401, '/api/_auth/session'));
    await handleApiAuthError(ctx(401, '/api/webauthn/authenticate'));
    expect(state.clear).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('ignores 403', async () => {
    await handleApiAuthError(ctx(403, '/api/users'));
    expect(state.clear).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('ignores a network error (no response)', async () => {
    await handleApiAuthError(ctx(undefined));
    expect(state.clear).not.toHaveBeenCalled();
  });

  it('does not navigate when already on /sign-in', async () => {
    state.routePath = '/sign-in';
    await handleApiAuthError(ctx(401));
    expect(state.clear).toHaveBeenCalledTimes(1);
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('dedupes concurrent 401s to one logout', async () => {
    let release: () => void = () => {};
    state.clear = vi.fn(() => new Promise<void>((r) => { release = r; }));
    const a = handleApiAuthError(ctx(401));
    const b = handleApiAuthError(ctx(401));
    release();
    await Promise.all([a, b]);
    expect(state.clear).toHaveBeenCalledTimes(1);
    expect(state.navigate).toHaveBeenCalledTimes(1);
  });

  it('fires again on a later, separate 401', async () => {
    await handleApiAuthError(ctx(401));
    await handleApiAuthError(ctx(401));
    expect(state.clear).toHaveBeenCalledTimes(2);
  });

  it('resets local session when clear() rejects', async () => {
    state.clear = vi.fn(async () => { throw new Error('offline'); });
    await handleApiAuthError(ctx(401));
    expect(state.session.value).toBeNull();
    expect(state.navigate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nuxt/api-auth-guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `app/composable/authErrorGuard.ts`:

```ts
import type { FetchContext } from 'ofetch';

const AUTH_EXEMPT = ['/api/_auth/', '/api/webauthn/'];

// Prefer the request URL passed to $fetch; fall back to response.url. Parse to a
// pathname before prefix-matching so a query param can't spoof the check.
export function isAuthExemptUrl(request: unknown, response?: Response): boolean {
  const raw =
    typeof request === 'string'
      ? request
      : request instanceof Request
        ? request.url
        : (response?.url ?? '');
  try {
    const path = new URL(raw, window.location.origin).pathname;
    return AUTH_EXEMPT.some((p) => path.startsWith(p));
  } catch {
    return false; // unparseable -> not exempt -> safer to force logout
  }
}

let handling = false; // dedupe: N concurrent 401s -> one logout

// Call inside `nuxtApp.runWithContext()` (the plugin does this) so the Nuxt
// composables below resolve.
export async function handleApiAuthError({ request, response }: FetchContext): Promise<void> {
  if (response?.status !== 401) return;
  if (isAuthExemptUrl(request, response)) return;
  if (handling) return;
  handling = true;
  try {
    const { loggedIn, clear, session } = useUserSession();
    const wasLoggedIn = loggedIn.value;
    const route = useRoute();

    try {
      await clear();
    } catch {
      // `clear()` DELETEs /api/_auth/session first, then nulls local state; a
      // network failure leaves `session` populated. Reset it ourselves.
      session.value = null;
    }

    if (wasLoggedIn) {
      useToast().add({
        color: 'warning',
        title: 'Your session expired',
        description: 'Please sign in again to continue.',
      });
    }

    if (route.path !== '/sign-in') {
      await navigateTo({ path: '/sign-in', query: { redirect: route.fullPath } });
    }
  } finally {
    handling = false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/nuxt/api-auth-guard.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/composable/authErrorGuard.ts test/nuxt/api-auth-guard.test.ts
git commit -m "$(cat <<'EOF'
add authErrorGuard: force-logout on non-exempt 401, dedupe, remember path

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 8: `api-auth-guard.client.ts` plugin

**Files:**
- Create: `app/plugins/api-auth-guard.client.ts`
- Test: append a "plumbing" block to `test/nuxt/api-auth-guard.test.ts`

**Interfaces:**
- Consumes: `handleApiAuthError` from Task 7; `defineNuxtPlugin`, `$fetch` (Nuxt globals); `nuxtApp.runWithContext`.
- Produces: side effect — after the plugin runs, `globalThis.$fetch` is a wrapped instance that funnels response errors through `handleApiAuthError`. All `useFetch`/`useLazyFetch`/bare `$fetch` client calls are covered (they read `globalThis.$fetch` at call time — `node_modules/nuxt/dist/app/composables/fetch.js:111`).

- [ ] **Step 1: Write the failing test**

Append to `test/nuxt/api-auth-guard.test.ts`:

```ts
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { createError } from 'h3';
import authGuardPlugin from '../../app/plugins/api-auth-guard.client';

describe('api-auth-guard plugin wiring', () => {
  it('routes a real 401 through handleApiAuthError', async () => {
    registerEndpoint('/api/reports', () => { throw createError({ statusCode: 401 }); });
    const original = globalThis.$fetch;
    try {
      // @ts-expect-error minimal fake nuxtApp
      await authGuardPlugin({ runWithContext: (fn: () => unknown) => fn() });
      await globalThis.$fetch('/api/reports').catch(() => {});
      expect(state.navigate).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/sign-in' }),
      );
    } finally {
      globalThis.$fetch = original;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nuxt/api-auth-guard.test.ts`
Expected: FAIL — `Cannot find module '../../app/plugins/api-auth-guard.client'`.

- [ ] **Step 3: Write minimal implementation**

Create `app/plugins/api-auth-guard.client.ts`:

```ts
import { handleApiAuthError } from '~/composable/authErrorGuard';

// Overriding globalThis.$fetch covers every client call site: useFetch /
// useLazyFetch resolve `fetchOptions.$fetch || globalThis.$fetch` at call time,
// and bare $fetch() uses it directly.
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    onResponseError: (ctx) => nuxtApp.runWithContext(() => handleApiAuthError(ctx)),
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/nuxt/api-auth-guard.test.ts`
Expected: PASS (Task 7 cases + the wiring case).

- [ ] **Step 5: Full unit suite + typecheck**

Run: `npm run test` then `npm run typecheck`
Expected: PASS. Watch for other tests that assert on `$fetch` behaviour — none currently reassign it, and each vitest file is isolated, so the override does not leak between files.

- [ ] **Step 6: Commit**

```bash
git add app/plugins/api-auth-guard.client.ts test/nuxt/api-auth-guard.test.ts
git commit -m "$(cat <<'EOF'
add api-auth-guard client plugin: wrap $fetch with the auth-error handler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 9: End-to-end — session expiry

**Files:**
- Create: `test/e2e/session-expiry.auth.spec.ts`
- Read first (helpers/patterns): `test/e2e/webauthn.ts`, `test/e2e/settings.auth.spec.ts`, `test/e2e/global-setup.ts`

**Interfaces:**
- Consumes: the `auth` Playwright project (stored `storageState` = a logged-in user), the virtual authenticator helper in `test/e2e/webauthn.ts`.
- Produces: a spec proving the full loop — expire → 401 → redirect to `/sign-in?redirect=…` → re-auth → land back on the original page.

- [ ] **Step 1: Write the spec**

Create `test/e2e/session-expiry.auth.spec.ts`. Model structure on `test/e2e/settings.auth.spec.ts`; reuse the passkey helper the same way `test/e2e/reports.auth.spec.ts` / `global-setup.ts` do.

```ts
import { test, expect } from '@playwright/test';
// import the passkey sign-in helper the repo already uses in e2e (see test/e2e/webauthn.ts)

test('expired session bounces to sign-in and returns after re-auth', async ({ page, context }) => {
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/reports/);

  // Simulate the sealed session cookie expiring.
  await context.clearCookies();

  // Any authed API call now 401s. Force one.
  await page.goto('/settings');

  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await expect(page).toHaveURL(/redirect=%2Fsettings/);
  await expect(page.getByText(/session expired/i)).toBeVisible();

  // Re-authenticate with the virtual authenticator, then expect the redirect target.
  // await signInWithPasskey(page)   // <- repo helper
  // await expect(page).toHaveURL(/\/settings/);
});
```

Fill the commented lines using the actual helper signature in `test/e2e/webauthn.ts`. If the virtual authenticator credential does not survive `context.clearCookies()` (it should — it's a CDP authenticator, not a cookie), re-add it via the helper before re-auth.

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- session-expiry`
Expected: PASS. First run also boots the dev server (can take a while); `reuseExistingServer` is on outside CI.

- [ ] **Step 3: Commit**

```bash
git add test/e2e/session-expiry.auth.spec.ts
git commit -m "$(cat <<'EOF'
e2e: session expiry redirects to sign-in and returns after re-auth

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01F3z17NqEkvQuMsNwm5LM5S
EOF
)"
```

---

### Task 10: Full gate + manual verification

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: all green, including the five new test files.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: E2E suite**

Run: `npm run test:e2e`
Expected: all green (new spec + existing `*.auth` / `*.public`).

- [ ] **Step 4: Manual — anonymous report still works**

Start the app (`npm run dev`), open an incognito window (no session), submit a report from the public form. Expected: success + redirect to `/thank-you`. (Confirms `authorizeRequest` did not break `allowGuest`.)

- [ ] **Step 5: Manual — forbidden ≠ logout**

Sign in as a non-Admin user. Navigate directly to `/settings` (route middleware may redirect; if it doesn't, the `/api/users` fetch 403s). Expected: you stay signed in, no bounce to `/sign-in`, no "session expired" toast — at most a generic error.

- [ ] **Step 6: Manual — the actual bug**

Sign in. In devtools, delete the `unfare-session` cookie. Trigger any data fetch (navigate to `/reports`, or refresh a list). Expected: one "Your session expired" toast, redirect to `/sign-in?redirect=…`, and after signing back in you land where you were.

- [ ] **Step 7: Open the PR**

```bash
git push -u origin andy/iss-237-force-log-out
gh pr create --title "Force logout on auth error (#237)" --body "$(cat <<'EOF'
## Summary
- Server: `authorizeRequest` wrapper — unauthenticated requests to protected routes now return **401**, forbidden-but-authenticated stays **403**.
- Client: `api-auth-guard` plugin wraps `$fetch`; a non-exempt **401** clears the session and redirects to `/sign-in?redirect=<path>`, with a single "session expired" toast only when a real session died.
- `?redirect=` round-trips through sign-in and sign-up (`useAuthRedirect`, with an open-redirect guard).
- Killed the empty `response.statusText` error toasts (`reportNonAuthError`).

## Test plan
- [ ] `npm run test`
- [ ] `npm run typecheck`
- [ ] `npm run test:e2e`
- [ ] Manual: anonymous report submit still works
- [ ] Manual: non-Admin hitting a forbidden route is NOT logged out
- [ ] Manual: deleting the session cookie mid-session bounces to sign-in and returns after re-auth

Spec: `docs/specs/2026-09-07-issue-237-force-logout-on-auth-error.md`
Closes #237

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage**
- §5.1 server wrapper → Task 1. §5.1 route swap → Task 2.
- §5.2 `authErrorGuard` → Task 7. §5.2 plugin → Task 8. §5.2 `globalThis.$fetch` rationale baked into Task 8 interface note.
- §5.3 force-logout steps (dedupe, clear+fallback, conditional toast, redirect guard) → Task 7 implementation + tests.
- §5.4 `useAuthRedirect` → Task 3. §5.4 sign-in + sign-up wiring → Task 4.
- §6 `reportNonAuthError` → Task 5. §6 call-site swap → Task 6.
- §4.1 exempt prefixes + no-substring-spoof → Task 7 (`isAuthExemptUrl` + test).
- §4.2 wasLoggedIn split → Task 7 (two tests).
- §7 edge cases → Task 7 tests (concurrent, already-on-sign-in, clear() rejects, network error) + Task 10 manual (403 ≠ logout, anon report).
- §9.1–§9.7 test files → Tasks 1, 2, 3, 5, 7, 8, 9.
- Global constraint "401=unauth / 403=forbidden" → Task 1 + Task 2 drift guard.

**Placeholder scan** — Task 9's spec has intentionally-marked helper-call gaps (`signInWithPasskey`) because the exact helper signature must be read from `test/e2e/webauthn.ts` at execution; every other step has literal code.

**Type/name consistency**
- `authorizeRequest(event, ability, ...args)` — same signature Task 1 defines, Task 2 consumes.
- `handleApiAuthError(ctx)` / `isAuthExemptUrl(request, response?)` — Task 7 defines, Task 8 consumes `handleApiAuthError`.
- `useAuthRedirect(fallback?) → { target }` — Task 3 defines, Task 4 calls `target()`.
- `reportNonAuthError(response)` — Task 5 defines, Task 6 calls `reportNonAuthError(response)`.
- Toast copy `'Your session expired'` — Task 7 only (pages no longer toast auth statuses).
