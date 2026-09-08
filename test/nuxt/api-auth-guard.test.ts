import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { createError } from 'h3';
import { handleApiAuthError, isAuthExemptUrl } from '../../app/composable/authErrorGuard';
import authGuardPlugin from '../../app/plugins/api-auth-guard.client';

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
