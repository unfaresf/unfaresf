# Spec: Force logout on auth error (issue #237)

**Status:** Reviewed — ready to turn into an implementation plan
**Branch:** `andy/iss-237-force-log-out`
**Issue:** https://github.com/unfaresf/unfaresf/issues/237

---

## 1. Problem

Session cookie (`nuxt-auth-utils`, sealed, `maxAge` 1 week) expires or is revoked
while the SPA is open. Client keeps stale `loggedIn === true`. Next API call fails;
user sees an **empty red error toast** and a UI that still looks logged in. No
recovery path except manual reload.

### 1.1 Why the toast is empty

`app/pages/settings.vue` (x2) and `app/pages/reports/index.vue` (x1) do:

```ts
onResponseError({ response }) {
  toast.add({ color: 'error', title: response.statusText });
}
```

Server speaks HTTP/2 → no reason phrase → `response.statusText === ""` → blank toast.

### 1.2 Why status codes are currently ambiguous

`nuxt-authorization`'s `authorize(event, ability)` **always throws 403**.
`createAuthorizationError(message, statusCode = 403)` is the only error path and no
ability overrides `statusCode`. Consequences:

| Caller state | Route | Current status | Correct status |
|---|---|---|---|
| No session (expired / never logged in) | protected route | **403** | **401** |
| Valid session, missing role/ownership | protected route | 403 | 403 |
| No session | `allowGuest` route | passes | passes |

Only `server/api/subscriptions/index.delete.ts` throws an explicit `401` today.

So a client interceptor keyed on `401` alone would miss the primary case. We fix
the server first, then the client logic is unambiguous.

---

## 2. Goals

- Session that expires / is revoked **while the user was logged in** → clear local
  + server session, show exactly one "session expired" toast, redirect to
  `/sign-in`.
- A 401 on a stale tab that was **never** logged in → clear + redirect, **no**
  toast (nothing "expired"; a silent bounce to sign-in is enough).
- After sign-in (and sign-up), return the user to where they were headed
  (`?redirect=`).
- `403` (authenticated but forbidden) must **not** log the user out.
- No more empty error toasts.

## 3. Non-goals

- No change to the passkey login flow, `middleware/auth.ts`, or `middleware/admin.ts`.
- No refresh-token / silent-reauth mechanism.
- No change to SSR / first-load auth (already handled: `middleware/auth.ts` reads
  the session from the cookie and redirects unauthenticated users before render).
- No global rework of the per-page `onResponseError` toasts beyond the auth-status
  guard in §6.
- No change to *what* the session `maxAge` is or how the cookie is sealed.

---

## 4. Auth-error taxonomy (detection)

The interceptor must be precise about what counts as "session is dead". Decision
table, evaluated on the client in `onResponseError`:

| # | Signal | Meaning | Action |
|---|---|---|---|
| 1 | `response.status === 401` on a non-exempt `/api/*` URL | No valid session server-side (expired, revoked, tampered cookie, or never authed) | **Force logout** (§5.3) |
| 2 | `response.status === 403` | Valid session, lacks permission | No logout. Leave to caller / show "not allowed". |
| 3 | `401` on an **exempt** URL (§4.1) | Normal handshake / probe | Ignore — pass through to caller |
| 4 | Network error / no `response` | Offline, DNS, CORS, abort | Ignore — not an auth signal |
| 5 | `response.status` in 5xx | Server fault | Ignore |

### 4.1 Exempt URL prefixes

These legitimately return `401`/`403` as part of normal operation and must never
trigger logout:

- `/api/_auth/` — `nuxt-auth-utils` session endpoints. `GET /api/_auth/session`
  returns `401` whenever the user is logged out; `useUserSession().fetch()` and
  `clear()` hit these.
- `/api/webauthn/` — passkey registration/authentication handshake; a failed
  passkey attempt is a `400`/`401` that the sign-in page already surfaces.

Match against the **request** URL (fall back to `response.url`) — parse to a
pathname first, then `startsWith` on the prefix list. Never substring-match the
raw URL: `?redirect=/api/_auth/x` must not exempt a call to `/api/reports`.

### 4.2 "Expired" vs "never authenticated"

Server cannot distinguish these (both = "no user in session"). The client splits
on its own pre-request belief (`useUserSession().loggedIn.value` at the moment of
failure):

| `wasLoggedIn` | Toast | Clear | Redirect |
|---|---|---|---|
| `true` (session died under them) | **"Your session expired — please sign in again."** | yes | yes |
| `false` (stale tab, never authed) | **none** | yes | yes |

Clear + redirect are identical; only the toast differs. The `false` branch is
reachable only from a tab that has been open without a session (e.g. left on a
public page, then a background poll fires) — a silent bounce to `/sign-in` is the
right UX, an "expired" toast would be a lie.

---

## 5. Design

### 5.1 Server — `authorizeRequest` wrapper

**New:** `server/utils/authorize-request.ts`

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
 * route requires a user and the request has no session. 403 stays reserved for
 * "authenticated but not allowed", so the client can safely force-logout on 401
 * only. Resolves the user the same way the framework helper does — via
 * `event.context.$authorization` (set by `server/plugins/authorization-resolver.ts`).
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

Notes:
- `ability.allowGuest` is a public field on the object returned by `defineAbility`
  (`false` for the function-only form, the passed value for the options form).
- `checkAbility` is the **low-level** 3-arg form from `nuxt-authorization/utils`
  (`(ability, user, ...args)`), not the auto-imported server helper — so this file
  has zero auto-import dependencies and is unit-testable with a hand-built `event`.
- It still throws `AuthorizationError` (403) for a logged-in user who fails the
  ability, which we normalise to `createError` exactly like the framework helper.
- `createError` lives in `server/utils/` → `authorizeRequest` is Nitro
  auto-imported into route handlers.
- For `allowGuest` abilities with no user we skip the 401 and let the ability run
  (it gets `null`) — anonymous reporting (`createReports`) and public GETs
  unchanged.

**Modify:** replace `authorize(event, ` → `authorizeRequest(event, ` in all 29
handlers that call it (list in §8). Pure mechanical swap; the arg list is
identical. `server/api/subscriptions/index.delete.ts` keeps its existing explicit
`401` guard (it looks up the row before authorizing) — swapping its `authorize`
call is still correct and harmless.

**Do not touch:** `server/plugins/authorization-resolver.ts`,
`app/plugins/authorization-resolver.ts`, `server/api/webauthn/*` (no `authorize`
call; login handshake).

### 5.2 Client — global fetch interceptor

Two files: a testable handler in `app/composable/` + a thin `.client.ts` plugin
that wires it onto `$fetch`. `.client.ts` because the session only expires *while
the app is open* in the browser; SSR/first-load is already covered by route
middleware, and SSR local `useFetch` bypasses `globalThis.$fetch` anyway
(`useRequestFetch()` — `node_modules/nuxt/dist/app/composables/fetch.js:111`).

**New:** `app/composable/authErrorGuard.ts`

```ts
import type { FetchContext } from 'ofetch';

// The app's own API paths, minus the prefixes nuxt-auth-utils owns: `clear()`
// DELETEs `/api/_auth/session` through the patched $fetch, and the webauthn
// sign-in flows live under `/api/webauthn/`.
const AUTH_EXEMPT = ['/api/_auth/', '/api/webauthn/'];

// Only a 401 from the app's own guarded API means "your session is gone"; a
// 401 from any other URL (a third-party host, some other module's endpoint)
// is not a session-expiry signal and must not force a logout. Prefer the
// request URL passed to $fetch; fall back to response.url. Parse to a pathname
// before prefix-matching so a query param can't spoof the check.
export function isGuardedApiUrl(request: unknown, response?: Response): boolean {
  const raw =
    typeof request === 'string' ? request
    : request instanceof Request ? request.url
    : response?.url ?? '';
  try {
    const path = new URL(raw, 'http://localhost').pathname;
    return path.startsWith('/api/') && !AUTH_EXEMPT.some((p) => path.startsWith(p));
  } catch {
    return false; // unparseable → not ours → don't force logout
  }
}

let handling = false; // dedupe: N concurrent 401s → one logout

// Call inside `nuxtApp.runWithContext()` (the plugin does this) so the Nuxt
// composables below resolve.
export async function handleApiAuthError({ request, response }: FetchContext): Promise<void> {
  if (response?.status !== 401) return;
  if (!isGuardedApiUrl(request, response)) return;
  if (handling) return;
  handling = true;
  try {
    const { loggedIn, clear, session } = useUserSession();
    const wasLoggedIn = loggedIn.value;
    const route = useRoute();

    try {
      await clear();
    } catch {
      // `clear()` does `DELETE /api/_auth/session` FIRST, then nulls local state
      // — a network failure leaves `session` populated. Reset it ourselves.
      // (`/api/_auth/` is exempt, so this DELETE never recurses.)
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

**New:** `app/plugins/api-auth-guard.client.ts`

```ts
import { handleApiAuthError } from '~/composable/authErrorGuard';

export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    onResponseError: (ctx) => nuxtApp.runWithContext(() => handleApiAuthError(ctx)),
  });
});
```

Why override `globalThis.$fetch`: `useFetch` / `useLazyFetch` resolve
`fetchOptions.$fetch || globalThis.$fetch` at call time
(`node_modules/nuxt/dist/app/composables/fetch.js:111`), and bare `$fetch` calls
(e.g. `app/composable/reportSubmit.ts`) use it directly. One override covers every
client call site — no per-call-site edits.

Interceptor precedence — **corrected during implementation**: ofetch 1.5.1
`resolveFetchOptions` merges options as `{ ...defaults, ...input }`
(`node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs:98-118`), so a per-call
`onResponseError` passed via `useFetch`/`useLazyFetch` options **replaces** the
`$fetch.create` one — they do **not** both fire. Consequences:

- A `useFetch`/`useLazyFetch`/`$fetch` call with **no** own `onResponseError`
  runs the global guard (covers the large majority of call sites).
- A call **with** its own `onResponseError` must forward the 401 itself. The three
  such sites (`app/pages/settings.vue` ×2, `app/pages/reports/index.vue` ×1) go
  through `reportNonAuthError` (§6), which is therefore responsible for calling
  `handleApiAuthError(ctx)` on a 401 rather than swallowing it.

### 5.3 "Force logout" = these steps, in order

1. Set module `handling = true` (drop concurrent 401s).
2. `await clear()` from `useUserSession`. Note its order: it calls
   `DELETE /api/_auth/session` **first**, then sets local `session` to `null`. So
   on a network failure local state is left populated — the `catch` sets
   `session.value = null` manually. We deliberately do **not** call
   `useNotifications().disableNotifications()`
   here (unlike the manual logout in `useMobileNav.ts`) — the session is already
   dead so the unsubscribe API call would 401 too; the push subscription is
   cleaned up on next successful login / logout.
3. If `wasLoggedIn` — one `toast.add` ("Your session expired…"). Else no toast (§4.2).
4. If not already on `/sign-in`: `navigateTo('/sign-in', { query: { redirect } })`.
5. `handling = false` (so a later, unrelated expiry can still fire).

### 5.4 `?redirect=` round-trip

The guard is shared, so put it in a composable instead of copy-pasting into two
pages.

**New:** `app/composable/useAuthRedirect.ts`

```ts
// Same-origin, app-internal path from `?redirect=`, or a fallback.
// Rejects protocol-relative (`//host`), absolute URLs, and loops back to an
// auth page.
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

**Modify:** `app/pages/sign-in.vue` — replace the hard-coded
`await navigateTo('/reports')` in the `signIn()` success branch:

```ts
const { target } = useAuthRedirect();
// ...
.then(async () => { await navigateTo(target()); })
```

**Modify:** `app/pages/sign-up.vue` — replace `await navigateTo('/')` in the
`signUp()` success branch with `await navigateTo(target())`, using
`const { target } = useAuthRedirect('/')` so the no-`redirect` fallback stays `/`
(its current landing), not `/reports`.

The interceptor (§5.2) is what puts `?redirect=<fullPath>` on the `/sign-in` URL;
a user who deep-links to `/sign-up?redirect=…` is also honoured.

---

## 6. Cleanup — kill empty toasts

The three per-call handlers (`app/pages/settings.vue` ×2, `app/pages/reports/index.vue`
×1) are byte-identical `toast.add({ color:'error', title: response.statusText })`.
Replace with a shared helper. Because a per-call `onResponseError` **replaces** the
global `$fetch` guard (§5.2, corrected), this helper also owns forwarding the 401
to `handleApiAuthError` — otherwise an expired session on these pages' refetches
would be silently swallowed.

**New:** `app/composable/apiErrorToast.ts`

```ts
import type { FetchContext } from 'ofetch';
import { handleApiAuthError } from '~/composable/authErrorGuard';

// A page's per-fetch `onResponseError` REPLACES the global $fetch guard
// (ofetch merges options as {...defaults, ...input}), so 401 is forwarded to the
// guard here; 403 is the page's own concern; everything else gets a real,
// non-empty toast (HTTP/2 has no `statusText`, which is why `title:
// response.statusText` rendered blank).
export function reportNonAuthError(ctx: FetchContext): void {
  const status = ctx.response?.status;
  if (status === 401) {
    useNuxtApp().runWithContext(() => handleApiAuthError(ctx));
    return;
  }
  if (status === 403) return;
  useToast().add({
    color: 'error',
    title: 'Something went wrong',
    description: ctx.response?._data?.message ?? ctx.response?._data?.statusMessage ?? undefined,
  });
}
```

Each call site becomes:

```ts
import { reportNonAuthError } from '~/composable/apiErrorToast';
// ...
onResponseError(ctx) { reportNonAuthError(ctx); }
```

---

## 7. Edge cases & risks

| Case | Handling |
|---|---|
| Multiple `useLazyFetch` on a page all 401 at once | `handling` flag → one `clear`, at most one toast, one redirect |
| 401 fires while already on `/sign-in` (e.g. background poll) | `clear` (+ toast if `wasLoggedIn`), **no** navigate (guard on `route.path`) |
| 401 on a stale never-authed tab | `clear` + redirect, **no** toast (`wasLoggedIn === false`) |
| `clear()` itself network-fails | try/catch → interceptor sets `session.value = null` (nuxt-auth-utils nulls local state only *after* its `DELETE` succeeds) |
| `DELETE /api/_auth/session` triggers interceptor recursively | `/api/_auth/` is exempt → no recursion |
| Logged-in non-admin hits an admin route (`/api/users`) | Server returns **403** (valid session) → no logout; page shows generic error |
| `redirect` query is `//evil.com` or `https://evil.com` | `useAuthRedirect().target()` rejects → fallback (`/reports` for sign-in, `/` for sign-up) |
| Anonymous report submit (`createReports`, `allowGuest`) | `authorizeRequest` skips session check → unchanged |
| SSR render hits expired cookie | `middleware/auth.ts` already redirects; interceptor is client-only |
| `useToast()` called outside setup in interceptor | Wrapped in `nuxtApp.runWithContext()` |
| A future route forgets `authorizeRequest` and uses raw `authorize` | Falls back to old behaviour (403 for unauthed) — degraded, not broken. Caught by the drift-guard test (§9.5). |

---

## 8. File-by-file change list

**Create**
- `server/utils/authorize-request.ts` — `authorizeRequest` wrapper (§5.1)
- `app/composable/authErrorGuard.ts` — `handleApiAuthError` + `isGuardedApiUrl` (§5.2)
- `app/plugins/api-auth-guard.client.ts` — thin plugin wiring the handler onto `$fetch` (§5.2)
- `app/composable/useAuthRedirect.ts` — shared `?redirect=` guard (§5.4)
- `app/composable/apiErrorToast.ts` — `reportNonAuthError` shared handler (§6)
- `test/unit/authorize-request.test.ts` — server wrapper unit tests (§9.1)
- `test/nuxt/api-auth-guard.test.ts` — `handleApiAuthError` + plugin wire tests (§9.2)
- `test/unit/useAuthRedirect.test.ts` — redirect-guard unit tests (§9.4)
- `test/nuxt/apiErrorToast.test.ts` — `reportNonAuthError` tests (§9.7)
- `test/unit/authorize-request-drift.test.ts` — no raw `authorize(event,` anywhere
  under `server/**`; every `server/api/**` handler calls `authorizeRequest`
  (webauthn allow-listed); client `onResponseError` overrides forward 401s via
  `reportNonAuthError` (§9.5)
- `test/e2e/session-expiry.auth.spec.ts` — Playwright e2e; `.auth.` infix so it
  runs with the stored logged-in `storageState` (§9.3)

**Modify — swap `authorize(event,` → `authorizeRequest(event,`** (29 files)
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

**Modify — other**
- `app/pages/sign-in.vue` — use `useAuthRedirect()` for the post-login navigate (§5.4)
- `app/pages/sign-up.vue` — use `useAuthRedirect('/')` for the post-register navigate (§5.4)
- `app/pages/settings.vue` — two `onResponseError` handlers → `reportNonAuthError` (§6)
- `app/pages/reports/index.vue` — one `onResponseError` handler → `reportNonAuthError` (§6)

---

## 9. Testing

### 9.1 Server unit — `test/unit/authorize-request.test.ts`
Fake event: `{ context: { $authorization: { resolveServerUser: async () => user } } }`.
Real abilities from `shared/utils/abilities.ts`.
- `listReports` (non-guest) + `resolveServerUser` → `null` → throws, `statusCode === 401`
- `listReports` + a user → resolves
- `getUsers` (non-guest, Admin-only) + non-Admin user → throws, `statusCode === 403`
- `createReports` (`allowGuest`) + `null` user → resolves (no 401)
- `updateUsers` (takes `targetUserId`) + Admin user + `...args` → the arg reaches
  the ability (Admin editing another id resolves; editing own id → 403)

### 9.2 Client — `test/nuxt/api-auth-guard.test.ts`
(`@nuxt/test-utils` + `vitest`, `environment: 'nuxt'`; `mockNuxtImport` for
`useUserSession` / `useToast` / `navigateTo` / `useRoute`.)

Calling `handleApiAuthError(ctx)` directly:
- `wasLoggedIn=true`, 401, `request='/api/reports'` → `clear()` once, `navigateTo`
  `{ path:'/sign-in', query:{ redirect: route.fullPath } }`, exactly one toast
- `wasLoggedIn=false`, 401, `/api/reports` → `clear()` once, `navigateTo` to
  `/sign-in`, **zero** toasts
- 401, `/api/_auth/session` → no `clear`, no navigate, no toast
- 401, `/api/webauthn/authenticate` → no `clear`, no navigate
- 401, `request='/api/reports?foo=/api/_auth/x'` (query can't spoof) → forces logout
- 403, `/api/users` → no `clear`, no navigate
- two concurrent calls (invoke, invoke, then await both) → `clear` + `navigateTo`
  once total (`handling` flag)
- a later call after the first resolves → fires again (`handling` back to false)
- `route.path === '/sign-in'` → `clear` (+ toast if `wasLoggedIn`), `navigateTo`
  **not** called
- `clear()` rejects → `session.value` set to `null`, flow still redirects
- `response` undefined (network error) → nothing happens
- `isGuardedApiUrl`: `Request` object, plain string, and `undefined` request all
  resolve correctly

Plumbing test (plugin actually wired): run the plugin default with a fake
`nuxtApp` (`{ runWithContext: (fn) => fn() }`), `registerEndpoint('/api/reports',
() => { throw createError({ statusCode: 401 }) })`, `await
$fetch('/api/reports').catch(() => {})` → `navigateTo` mock called.

### 9.3 E2E — `test/e2e/session-expiry.auth.spec.ts`
(Playwright infra exists: `playwright.config.ts`, `npm run test:e2e`. `.auth.`
infix → runs in the `auth` project with the stored logged-in `storageState`.)
- Start on `/reports` (already authed via `storageState`)
- `context.clearCookies()` — simulates the sealed session cookie expiring
- Trigger an API call: click a control that refetches, or `page.goto('/settings')`
- Assert: URL is `/sign-in`, `redirect` query param present and pointing at the
  page we were on, an "expired" toast is visible
- Complete passkey sign-in (reuse `test/e2e/webauthn.ts` helper) → assert we land
  on the `redirect` target, not the default

### 9.4 Redirect guard — `test/unit/useAuthRedirect.test.ts`
Stub `useRoute` with a `query`. Assert `target()` returns:
- `/reports/42` for `?redirect=/reports/42` (fallback `/reports`)
- fallback for absent `redirect`
- fallback for `?redirect=//evil.com`
- fallback for `?redirect=https://evil.com`
- fallback for `?redirect=/sign-in` and `?redirect=/sign-up` (no loop)
- fallback for control-character smuggles (`?redirect=/\t/evil.com`, `\n`, `\r`
  forms that parse to `//evil.com`)
- fallback for array-valued `redirect` (`?redirect=a&redirect=b`)
- the passed fallback (`/`) is honoured when constructed as `useAuthRedirect('/')`

### 9.5 Drift guard — `test/unit/authorize-request-drift.test.ts`
Three invariants: (1) no `server/**/*.ts` matches `/\bauthorize\s*\(\s*event\b/`
(i.e. no raw helper anywhere, not just `server/api`); (2) every `server/api/**/*.ts`
handler calls `authorizeRequest(event,` — except the intentionally-unauthenticated
webauthn sign-in handlers; (3) any `app/**` file that overrides
`onResponseError(` must route 401s through `reportNonAuthError`, because a
per-call hook replaces the global guard. Keeps future routes on
`authorizeRequest` and future per-call hooks on the forwarding helper.

### 9.6 Regression
- `npm run test` (vitest) green
- `npm run typecheck` green
- Manual: anonymous report submission still works (`createReports` `allowGuest`)
- Manual: logged-in non-admin hitting `/settings` gets 403, stays logged in

### 9.7 Toast helper — `test/nuxt/apiErrorToast.test.ts`
`mockNuxtImport('useToast')`. `reportNonAuthError`:
- `{ status: 401 }` → no `add`
- `{ status: 403 }` → no `add`
- `{ status: 500 }` → `add` with `title: 'Something went wrong'` (never `''`)
- `{ status: 400, _data: { message: 'Bad thing' } }` → `add` with
  `description: 'Bad thing'`

---

## 10. Rollout

Single PR. No env vars, no migration, no `nuxt.config` change. Revert = delete the
five new source files (`server/utils/authorize-request.ts`,
`app/composable/authErrorGuard.ts`, `app/plugins/api-auth-guard.client.ts`,
`app/composable/useAuthRedirect.ts`, `app/composable/apiErrorToast.ts`) + revert
the mechanical swaps and the four page edits.

---

## 11. Resolved decisions

1. **`sign-up.vue` gets `?redirect=` too** — shared via `useAuthRedirect()`
   composable, fallback `/` for sign-up, `/reports` for sign-in.
2. **No toast on the never-authenticated branch** — `wasLoggedIn === false` →
   silent `clear` + redirect. Toast only when a real session died.
3. **Drift guard is in scope** — `test/unit/authorize-request-drift.test.ts`
   (§9.5) fails the unit suite if any `server/api/**` file still calls raw
   `authorize(event,`.
