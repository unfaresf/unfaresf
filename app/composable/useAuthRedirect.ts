// Resolves a safe post-auth destination from `?redirect=`. Accepts only
// same-origin, app-internal paths; rejects protocol-relative (`//host` and the
// `/\host` backslash form), absolute URLs, and loops back to an auth page.
export function useAuthRedirect(fallback = '/reports') {
  const route = useRoute();

  function target(): string {
    const r = route.query.redirect;
    if (
      typeof r === 'string' &&
      r.startsWith('/') &&
      !/^\/[\\/]/.test(r) &&           // reject //host and /\host
      !r.startsWith('/sign-in') &&
      !r.startsWith('/sign-up')
    ) {
      return r;
    }
    return fallback;
  }

  return { target };
}
