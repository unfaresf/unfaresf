import type { H3Event } from 'h3';
import { createError } from 'h3';
import {
  authorize as checkAbility,
  AuthorizationError,
  type BouncerAbility,
  type BouncerArgs,
} from 'nuxt-authorization/utils';

/**
 * Like nuxt-authorization's server `authorize`, but throws 401 (not 403) when the
 * route requires a user and the request has no session, so the client can safely
 * force-logout on 401 only. Resolves the user via `event.context.$authorization`,
 * set by `server/plugins/authorization-resolver.ts`.
 */
export async function authorizeRequest<Ability extends BouncerAbility<any>>(
  event: H3Event,
  ability: Ability,
  ...args: BouncerArgs<Ability>
): Promise<void> {
  const user = await event.context.$authorization.resolveServerUser();

  if (!user && !ability.allowGuest) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' });
  }

  try {
    await checkAbility(ability, user ?? null, ...args);
  } catch (err) {
    if (err instanceof AuthorizationError) {
      // Abilities return 403 today. If one ever emits 401 via deny({statusCode})
      // it would force-logout an authenticated user — clamp here if that changes.
      throw createError({ statusCode: err.statusCode, message: err.message });
    }
    throw err;
  }
}
