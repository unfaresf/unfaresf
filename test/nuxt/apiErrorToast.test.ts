import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { reportNonAuthError } from '../../app/composable/apiErrorToast';
import { handleApiAuthError } from '../../app/composable/authErrorGuard';

vi.mock('../../app/composable/authErrorGuard', () => ({
  handleApiAuthError: vi.fn(),
  isAuthExemptUrl: vi.fn(),
}));

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));
mockNuxtImport('useNuxtApp', () => () => ({ runWithContext: (fn: any) => fn() }));

afterEach(() => {
  toastAdd.mockClear();
  vi.mocked(handleApiAuthError).mockClear();
});

describe('reportNonAuthError', () => {
  it('forwards a 401 to the auth guard and stays silent', () => {
    const ctx = { response: { status: 401 } } as any;
    reportNonAuthError(ctx);
    expect(handleApiAuthError).toHaveBeenCalledTimes(1);
    expect(handleApiAuthError).toHaveBeenCalledWith(ctx);
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('stays silent on 403', () => {
    reportNonAuthError({ response: { status: 403 } } as any);
    expect(handleApiAuthError).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('shows a non-empty title on 500', () => {
    reportNonAuthError({ response: { status: 500 } } as any);
    expect(handleApiAuthError).not.toHaveBeenCalled();
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'error', title: 'Something went wrong' }),
    );
  });

  it('uses _data.message as the description when present', () => {
    reportNonAuthError({ response: { status: 400, _data: { message: 'Bad thing' } } } as any);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Bad thing' }),
    );
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

describe('call sites no longer toast response.statusText', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = [
    '../../app/pages/settings.vue',
    '../../app/pages/reports/index.vue',
  ];
  for (const rel of files) {
    it(`${rel} has no title: response.statusText`, () => {
      const src = readFileSync(resolve(here, rel), 'utf8');
      expect(src).not.toMatch(/title:\s*response\.statusText/);
    });
  }
});
