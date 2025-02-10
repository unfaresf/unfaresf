import { desc, eq, sql, isNull, getTableColumns } from 'drizzle-orm';
import { DB as db } from "../sqlite-service";
import { users as usersTable, subscriptions as subscriptionsTable } from "../../db/schema";
import { getUsers } from "../../shared/utils/abilities";
import { z } from "zod";

const usersGetQuerySchema = z.object({
  page: z.number({ coerce: true }).min(0).int().default(0),
  limit: z.number({ coerce: true }).min(0).max(100).int().default(20),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getUsers);

  try {
    const { page, limit } = await getValidatedQuery(event, usersGetQuerySchema.parse);
    const actSub = db.select({userId: subscriptionsTable.userId}).from(subscriptionsTable).where(isNull(subscriptionsTable.deletedAt)).as('actSub');
    const [count, result] = await Promise.all([
      db.$count(usersTable),
      db.select({
        ...getTableColumns(usersTable),
        hasActiveSubscription: sql<boolean>`CASE WHEN ${actSub.userId} IS NULL THEN false ELSE true END`,
      })
      .from(usersTable)
      .leftJoin(actSub, eq(actSub.userId, usersTable.id))
      .limit(limit)
      .offset((page*limit)-limit)
      .orderBy(desc(usersTable.createdAt))
    ]);
    // JSON.parse of roles is because roles are stored as a stringified array of strings
    const users = result.map(user => {
      return {
        ...user,
        ...{ roles: JSON.parse(user.roles).sort() }
      };
    })
    return {
      count,
      result: users
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});