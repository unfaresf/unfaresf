import { describe, it, expect, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useAuthRedirect } from '../../app/composable/useAuthRedirect';

const { routeQuery } = vi.hoisted(() => ({ routeQuery: { value: {} as Record<string, unknown> } }));
mockNuxtImport('useRoute', () => () => ({ query: routeQuery.value }));

function withQuery(q: Record<string, unknown>) {
  routeQuery.value = q;
}

describe('useAuthRedirect', () => {
  it('returns a clean internal path', () => {
    withQuery({ redirect: '/reports/42' });
    expect(useAuthRedirect().target()).toBe('/reports/42');
  });

  it('falls back when redirect is absent', () => {
    withQuery({});
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects protocol-relative URLs', () => {
    withQuery({ redirect: '//evil.com' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects the backslash protocol-relative form', () => {
    withQuery({ redirect: '/\\evil.com' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects absolute URLs', () => {
    withQuery({ redirect: 'https://evil.com' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects loops back to auth pages', () => {
    withQuery({ redirect: '/sign-in' });
    expect(useAuthRedirect().target()).toBe('/reports');
    withQuery({ redirect: '/sign-up?foo=1' });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('rejects an array-valued redirect', () => {
    withQuery({ redirect: ['/a', '/b'] });
    expect(useAuthRedirect().target()).toBe('/reports');
  });

  it('honours a custom fallback', () => {
    withQuery({});
    expect(useAuthRedirect('/').target()).toBe('/');
  });
});
