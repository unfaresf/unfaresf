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
