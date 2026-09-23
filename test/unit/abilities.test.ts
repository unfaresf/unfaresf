import { describe, it, expect } from 'vitest';
import { allows } from 'nuxt-authorization/utils';
import { broadcastReportsDirectly } from '../../shared/utils/abilities';
import { Roles } from '../../db/schema';

describe('broadcastReportsDirectly', () => {
  it('allows an Admin', async () => {
    await expect(allows(broadcastReportsDirectly, { id: 1, roles: [Roles.Admin] } as any)).resolves.toBe(true);
  });

  it('allows an Editor', async () => {
    await expect(allows(broadcastReportsDirectly, { id: 2, roles: [Roles.Editor] } as any)).resolves.toBe(true);
  });

  it('denies an authenticated user with neither role', async () => {
    await expect(allows(broadcastReportsDirectly, { id: 3, roles: [] } as any)).resolves.toBe(false);
  });

  it('denies a guest', async () => {
    await expect(allows(broadcastReportsDirectly, null as any)).resolves.toBe(false);
  });
});
