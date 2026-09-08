import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';

const { navigate, routeQuery, authenticate, register, sessionFetch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  routeQuery: { value: {} as Record<string, unknown> },
  authenticate: vi.fn(async () => ({})),
  register: vi.fn(async () => ({})),
  sessionFetch: vi.fn(async () => {}),
}));

mockNuxtImport('navigateTo', () => navigate);
mockNuxtImport('useRoute', () => () => ({ query: routeQuery.value }));
mockNuxtImport('useUserSession', () => () => ({ fetch: sessionFetch }));
mockNuxtImport('useWebAuthn', () => () => ({ authenticate, register }));
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }));

afterEach(() => {
  navigate.mockClear();
  authenticate.mockClear();
  register.mockClear();
  routeQuery.value = {};
});

describe('sign-in redirect', () => {
  it('navigates to ?redirect= target on success', async () => {
    routeQuery.value = { redirect: '/reports/7' };
    const page = await mountSuspended((await import('../../app/pages/sign-in.vue')).default);
    await page.find('button').trigger('click');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports/7');
  });

  it('falls back to /reports with no redirect', async () => {
    const page = await mountSuspended((await import('../../app/pages/sign-in.vue')).default);
    await page.find('button').trigger('click');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports');
  });
});

describe('sign-up redirect', () => {
  it('navigates to ?redirect= target on success', async () => {
    routeQuery.value = { redirect: '/reports/7' };
    const page = await mountSuspended((await import('../../app/pages/sign-up.vue')).default);
    page.find('input').setValue('newuser');
    await page.find('form').trigger('submit');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/reports/7');
  });

  it('falls back to / with no redirect', async () => {
    const page = await mountSuspended((await import('../../app/pages/sign-up.vue')).default);
    page.find('input').setValue('newuser');
    await page.find('form').trigger('submit');
    await flushPromises();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
