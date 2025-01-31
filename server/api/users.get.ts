import { desc, isNull, isNotNull } from 'drizzle-orm';
import { DB as db } from "../sqlite-service";
import { users as usersTable } from "../../db/schema";
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
    const [count, result] = await Promise.all([
      db.$count(usersTable),
      db.select()
        .from(usersTable)
        .limit(limit)
        .offset((page*limit)-limit)
        .orderBy(desc(usersTable.createdAt))
    ]);
    const users = result.map(u => {
      return {
        ...u,
        ...{ roles: JSON.parse(u.roles)}
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