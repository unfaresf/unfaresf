import { handleApiAuthError } from '~/composable/authErrorGuard';

// Overriding globalThis.$fetch covers every client call site: useFetch /
// useLazyFetch resolve `fetchOptions.$fetch || globalThis.$fetch` at call time,
// and bare $fetch() uses it directly.
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    onResponseError: (ctx) => nuxtApp.runWithContext(() => handleApiAuthError(ctx)),
  });
});
