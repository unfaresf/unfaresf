import { describe, it, expect } from 'vitest';
import { authorizeRequest } from '../../server/utils/authorize-request';
import {
  listReports,
  createReports,
  getUsers,
  updateUsers,
} from '../../shared/utils/abilities';
import { Roles } from '../../db/schema';

type FakeUser = { id: number; roles: string[] };

function eventFor(user: FakeUser | null) {
  return {
    context: {
      $authorization: { resolveServerUser: async () => user },
    },
  } as any;
}

const admin: FakeUser = { id: 1, roles: [Roles.Admin] };
const editor: FakeUser = { id: 2, roles: [Roles.Editor] };

describe('authorizeRequest', () => {
  it('throws 401 when a protected ability has no session user', async () => {
    await expect(authorizeRequest(eventFor(null), listReports)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('resolves when a protected ability has a user that passes', async () => {
    await expect(authorizeRequest(eventFor(editor), listReports)).resolves.toBeUndefined();
  });

  it('throws 403 when a present user fails the ability', async () => {
    await expect(authorizeRequest(eventFor(editor), getUsers)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('does not throw 401 for an allowGuest ability with no user', async () => {
    await expect(authorizeRequest(eventFor(null), createReports)).resolves.toBeUndefined();
  });

  it('forwards extra args to the ability', async () => {
    // updateUsers(user, targetUserId): Admin editing another id is allowed,
    // editing own id is denied — proves the arg reached the ability.
    await expect(authorizeRequest(eventFor(admin), updateUsers, 999)).resolves.toBeUndefined();
    await expect(authorizeRequest(eventFor(admin), updateUsers, admin.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
