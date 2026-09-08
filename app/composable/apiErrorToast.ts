import type { FetchContext } from 'ofetch';
import { handleApiAuthError } from '~/composable/authErrorGuard';

// A page's per-fetch `onResponseError` REPLACES the global $fetch guard (ofetch
// merges options as {...defaults, ...input}), so 401 is forwarded to the guard
// here; 403 is the page's own concern; everything else gets a real, non-empty
// toast (HTTP/2 has no `statusText`, which is why `title: response.statusText`
// rendered blank).
// True when an ofetch error (or any {statusCode}/{response.status} shape) is a
// 401/403 — i.e. the global auth guard has it (401) or it's a forbidden the page
// shouldn't toast (403). Use to early-return from a fetch `catch` block.
export function isAuthStatus(err: unknown): boolean {
  const s = (err as any)?.statusCode ?? (err as any)?.response?.status;
  return s === 401 || s === 403;
}

export function reportNonAuthError(ctx: FetchContext): void {
  const status = ctx.response?.status;
  if (status === 401) {
    void useNuxtApp().runWithContext(() => handleApiAuthError(ctx)).catch(() => {});
    return;
  }
  if (status === 403) return;
  useToast().add({
    color: 'error',
    title: 'Something went wrong',
    description: ctx.response?._data?.message ?? ctx.response?._data?.statusMessage ?? undefined,
  });
}
