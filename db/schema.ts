import { type InferSelectModel, type InferInsertModel, sql, relations } from "drizzle-orm";
import { integer, sqliteTable, text, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  sourceId: string;
  source: string;
  message: string;
  approved: boolean;
  reviewedAt?: number;
}
export const reports = sqliteTable("reports", {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  sourceId: text().notNull(),
  source: text({ length: 64 }).notNull(),
  message: text({ length: 1024 }).notNull(),
  approved: integer({ mode: 'boolean' }).notNull().default(false),
  reviewedAt: integer("reviewed_at", { mode: 'timestamp' }),
}, table => [
  uniqueIndex("source_unq_idx").on(table.source, table.sourceId)
]);

export const reportInsertSchema = createInsertSchema(reports);
export type SelectReport = InferSelectModel<typeof reports>;
export type InsertReport = InferInsertModel<typeof reports>;