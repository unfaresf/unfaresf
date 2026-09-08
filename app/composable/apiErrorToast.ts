import type { FetchContext } from 'ofetch';
import { handleApiAuthError } from '~/composable/authErrorGuard';

// A page's per-fetch `onResponseError` REPLACES the global $fetch guard (ofetch
// merges options as {...defaults, ...input}), so 401 is forwarded to the guard
// here; 403 is the page's own concern; everything else gets a real, non-empty
// toast (HTTP/2 has no `statusText`, which is why `title: response.statusText`
// rendered blank).
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
