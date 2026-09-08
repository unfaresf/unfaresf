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
