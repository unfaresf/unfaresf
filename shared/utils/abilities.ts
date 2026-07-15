import { users } from '../../db/schema';

type User = typeof users.$inferSelect;

// report abilities
export const createReports = defineAbility({ allowGuest: true }, (user: User | null) => true); // all users can report
export const listReports = defineAbility(() => true); // Only authenticated users can list reports
export const getReport = defineAbility(() => true); // Only authenticated users can list reports
export const updateReports = defineAbility(() => true);

// invite abilities
export const createInvites = defineAbility((user: User) => user.roles.includes('Admin'));

// broadcasts abilities
export const createBroadcasts = defineAbility(() => true);
export const listBroadcasts = defineAbility({ allowGuest: true }, (user: User | null) => true);
export const listBroadcastsGeo = defineAbility({ allowGuest: true }, (user: User | null) => true);

// health check endpoint
export const getHealth = defineAbility({ allowGuest: true }, (user: User | null) => true);

// gtfs data fetch endpoints
export const getGtfs = defineAbility({ allowGuest: true }, (user: User | null) => true);

// settings/admin abilities
export const getUsers = defineAbility((user: User) => user.roles.includes('Admin'));
export const updateUsers = defineAbility((user: User, targetUserId: number) => {
  if (!user.roles.includes('Admin')) return false;
  // prevent users from editting self for time being.
  if (user.id === targetUserId) return false;
  return true;
});
export const deleteUsers = defineAbility((user: User, targetUserId: number) => {
  if (!user.roles.includes('Admin')) return false;
  // prevent users from editting self for time being.
  if (user.id === targetUserId) return false;
  return true;
});
export const getIntegrations = defineAbility((user: User) => user.roles.includes('Admin'));
export const updateIntegrations = defineAbility((user: User) => user.roles.includes('Admin'));
export const getPublicIntegrations = defineAbility({ allowGuest: true }, (user: User | null) => true);

// user subscription abilities
export const createSubscription = defineAbility(() => true);
export const deleteSubscription = defineAbility((user: User, subscriptionUserId: number | null) => {
  // Ownership check. The subscription's owner is looked up in the route handler
  // (server/api/subscriptions/*.delete.ts) and passed in, so this shared ability
  // stays free of the server-only DB (shared/ must not import Nitro code).
  if (subscriptionUserId === null) return false;
  return user.id === subscriptionUserId;
});