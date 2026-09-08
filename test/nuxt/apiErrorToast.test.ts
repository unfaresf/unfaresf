import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { reportNonAuthError } from '../../app/composable/apiErrorToast';

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));

afterEach(() => toastAdd.mockClear());

describe('reportNonAuthError', () => {
  it('stays silent on 401', () => {
    reportNonAuthError({ status: 401 });
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('stays silent on 403', () => {
    reportNonAuthError({ status: 403 });
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it('shows a non-empty title on 500', () => {
    reportNonAuthError({ status: 500 });
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'error', title: 'Something went wrong' }),
    );
  });

  it('uses _data.message as the description when present', () => {
    reportNonAuthError({ status: 400, _data: { message: 'Bad thing' } });
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
