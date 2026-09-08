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
