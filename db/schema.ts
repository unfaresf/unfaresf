import { type InferSelectModel, type InferInsertModel, sql, relations } from "drizzle-orm";
import { integer, sqliteTable, text, primaryKey, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from 'drizzle-zod';

export const users = sqliteTable("users", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userName: text("username", { length: 64 }).unique().notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userInsertSchema = createInsertSchema(users);
export type SelectUser = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export const credentials = sqliteTable("credentials", {
  userId: integer("user_id").notNull().references(() => users.id),
  id: text().notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer().notNull(),
  backedUp: integer("backed_up").notNull(),
  transports: text().notNull(),
}, table => [
  primaryKey({ columns: [table.id, table.userId] }),
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

export type UnfareReport = {
  id: number;
  createdAt: number;
  source: string;
  reviewedAt?: number;
  route?: string;
  stop?: string;
  direction?: string;
  passenger?: boolean;
  uri?: string;
}
export const reports = sqliteTable("reports", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  source: text({ length: 64 }).notNull(),
  uri: text({ length: 2048 }).unique(),
  reviewedAt: integer("reviewed_at", { mode: 'timestamp' }),
  route: text({ length: 512 }),
  stop: text({ length: 512 }),
  direction: text({ length: 512 }),
  passenger: integer({ mode: 'boolean' }),
}, table => [
  index("source_idx").on(table.source),
  index("reviewed_at_idx").on(table.reviewedAt),
]);

export const reportInsertSchema = createInsertSchema(reports);
export type SelectReport = InferSelectModel<typeof reports>;
export type InsertReport = InferInsertModel<typeof reports>;

export const broadcasts = sqliteTable("broadcasts", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  message: text({ length: 1024 }).notNull(),
  platforms: text(),
});

export const broadcastInsertSchema = createInsertSchema(broadcasts);
export type SelectBroadcast = InferSelectModel<typeof broadcasts>;
export type InsertBroadcast = InferInsertModel<typeof broadcasts>;
