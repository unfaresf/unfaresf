import { type InferSelectModel, type InferInsertModel, sql, relations } from "drizzle-orm";
import { integer, sqliteTable, text, primaryKey, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export enum Roles {
  Admin = 'Admin',
  Editor = 'Editor',
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export const users = sqliteTable("users", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userName: text("username", { length: 64 }).unique().notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  roles: text().notNull().default(JSON.stringify([Roles.Editor])),
});

export const usersSubscriptions = relations(users, ({ many }) => ({
	subscriptions: many(subscriptions),
}));

export const userInsertSchema = createInsertSchema(users);
export type SelectUser = InferSelectModel<typeof users>;
export type GetUser = Prettify<Omit<InferSelectModel<typeof users>, 'roles'> & { roles: Roles[] }>;
export type InsertUser = InferInsertModel<typeof users>;

export const credentials = sqliteTable("credentials", {
  userId: integer("user_id").notNull().references(() => users.id),
  id: text().notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer().notNull(),
  backedUp: integer("backed_up").notNull(),
  transports: text().notNull(),
}, table => [
  primaryKey({ columns: [table.id, table.userId] })
]);

export type Credential = InferSelectModel<typeof credentials>;
export type InsertCredential = InferInsertModel<typeof credentials>;

export const usersRelations = relations(users, ({ many }) => ({
	credentials: many(credentials),
}));

export const invites = sqliteTable("invites", {
  id: text().primaryKey(),
  used: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const inviteInsertSchema = createInsertSchema(invites);
export type SelectInvite = InferSelectModel<typeof invites>;
export type InsertInvite = InferInsertModel<typeof invites>;

export const reports = sqliteTable("reports", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  source: text({ length: 64 }).notNull(),
  uri: text({ length: 2048 }).unique(),
  reviewedAt: integer("reviewed_at", { mode: 'timestamp' }),
  route: text({ mode: 'json' }).$type<{ routeId: string; routeShortName: string; routeLongName: string; agencyId: string; agencyName: string; direction: string; }>(),
  stop: text({ mode: 'json' }).$type<{ stopId: string; stopName: string; direction: string }>(),
  direction: text({ mode: 'json' }).$type<{ routeId: string; directionId: number|null; direction: string; }>(),
  passenger: integer({ mode: 'boolean' }),
  message: text({ length: 1000 }),
}, table => [
  index("source_idx").on(table.source),
  index("reviewed_at_idx").on(table.reviewedAt),
]);

export const reportsRelations = relations(reports, ({ one }) => ({
	broadcast: one(broadcasts)
}));

export const reportInsertSchema = createInsertSchema(reports);
export type SelectReport = InferSelectModel<typeof reports>;
export type InsertReport = InferInsertModel<typeof reports>;

export const broadcasts = sqliteTable("broadcasts", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  message: text({ length: 1024 }).notNull(),
  platforms: text(),
  reportId: integer("report_id", { mode: 'number' }).unique().references(() => reports.id),
});

export const broadcastsRelations = relations(broadcasts, ({ one }) => ({
	report: one(reports, { fields: [broadcasts.reportId], references: [reports.id] }),
}));

export const broadcastInsertSchema = createInsertSchema(broadcasts);
export type SelectBroadcast = InferSelectModel<typeof broadcasts>;
export type InsertBroadcast = InferInsertModel<typeof broadcasts>;

export const challenges = sqliteTable("challenges", {
  id: text().primaryKey(),
  challenge: text().notNull(),
});

export const challengesInsertSchema = createInsertSchema(challenges);
export type SelectChallenge = InferSelectModel<typeof challenges>;
export type InsertChallenge = InferInsertModel<typeof challenges>;

export const mastodonIntegrationOptionSchema = z.object({
  name: z.literal('mastodon').readonly(),
  token: z.string().optional(),
  url: z.string().url().optional(),
  accountName: z.string().optional(),
});

export const mapIntegrationOptionSchema = z.object({
  name: z.literal('map').readonly(),
  mapStylesUrl: z.string().url().optional(),
  tileServerDomain: z.string().url().optional(),
});

export type MastodonOption = z.infer<typeof mastodonIntegrationOptionSchema>;
export type MapOption = z.infer<typeof mapIntegrationOptionSchema>;

export const integrations = sqliteTable("integrations", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  enable: integer({ mode: 'boolean' }).notNull().default(false),
  options: text({ mode: 'json' }).notNull().$type<MastodonOption|MapOption>(),
});

export const integrationsInsertSchema = createInsertSchema(integrations);
export type SelectIntegration = InferSelectModel<typeof integrations>;
export type InsertIntegration = InferInsertModel<typeof integrations>;

export type SubscriptionDetails = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  }
};

export const subscriptions = sqliteTable("subscriptions", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  details: text({ mode: 'json' }).notNull().$type<SubscriptionDetails>(),
  deletedAt: integer("deleted_at", { mode: 'timestamp' }),
});

export const subscriptionsInsertSchema = createInsertSchema(subscriptions);
export type SelectSubscription = InferSelectModel<typeof subscriptions>;
export type InsertSubscription = InferInsertModel<typeof subscriptions>;

export const subscriptionsRelations = relations(subscriptions, ({ many, one }) => ({
  broadcasts: many(broadcasts),
	subscriber: one(users, {
		fields: [subscriptions.userId],
		references: [users.id],
	}),
}));

export type NotificationDetail = {
  reportUrl: string;
  title: string;
  body: string;
  tag: string;
};

export const notifications = sqliteTable("notifications", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  details: text({ mode: 'json' }).notNull().$type<NotificationDetail>(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id),
},  table => [
  index("notifications_created_at_idx").on(table.createdAt),
  index("notifications_subscription_id_idx").on(table.subscriptionId),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	subscription: one(subscriptions)
}));

export const notificationsInsertSchema = createInsertSchema(notifications);
export type SelectNotification = InferSelectModel<typeof notifications>;
export type InsertNotification = InferInsertModel<typeof notifications>;