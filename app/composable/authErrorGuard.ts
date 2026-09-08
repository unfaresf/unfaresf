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
    typeof request === 'string'
      ? request
      : request instanceof Request
        ? request.url
        : (response?.url ?? '');
  try {
    const path = new URL(raw, 'http://localhost').pathname;
    return path.startsWith('/api/') && !AUTH_EXEMPT.some((p) => path.startsWith(p));
  } catch {
    return false; // unparseable -> not ours -> don't force logout
  }
}

let handling = false; // dedupe: N concurrent 401s -> one logout

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
