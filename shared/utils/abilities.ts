import { users } from '../../db/schema';

type User = typeof users.$inferSelect;

// report abilities
export const createReports = defineAbility({ allowGuest: true }, (user: User | null) => true); // all users can report
export const listReports = defineAbility(() => true); // Only authenticated users can list reports
export const updateReports = defineAbility(() => true);

// invite abilities
export const createInvites = defineAbility(() => true);

// invite abilities
export const createBroadcasts = defineAbility(() => true);
export const listBroadcasts = defineAbility(() => true);

// health check endpoint
export const getHealth = defineAbility({ allowGuest: true }, (user: User | null) => true);

// gtfs data fetch endpoints
export const getGtfs = defineAbility({ allowGuest: true }, (user: User | null) => true);

// settings/admin abilities
export const getUsers = defineAbility((user: User) => user.roles.includes('Admin'));
export const updateUsers = defineAbility((user: User) => user.roles.includes('Admin'));