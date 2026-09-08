import { handleApiAuthError } from '~/composable/authErrorGuard';

// Overriding globalThis.$fetch covers every client call site: useFetch /
// useLazyFetch resolve `fetchOptions.$fetch || globalThis.$fetch` at call time,
// and bare $fetch() uses it directly.
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    onResponseError: (ctx) => {
      // Contain guard rejections: a throw here would replace the original 401
      // FetchError at the call site (ofetch awaits hooks).
      void nuxtApp.runWithContext(() => handleApiAuthError(ctx)).catch(() => {});
    },
  });
});
