import { desc, gte, lte, and } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service";
import { broadcasts as broadcastsTable } from "../../../db/schema";
import { listBroadcasts } from "../../../shared/utils/abilities";
import { z } from "zod";

const broadcastsGetQuerySchema = z.object({
  page: z.number({ coerce: true }).min(0).int().default(0),
  limit: z.number({ coerce: true }).min(0).max(100).int().default(20),
  from: z.string().datetime().pipe( z.coerce.date() ).optional(),
  to: z.string().datetime().pipe( z.coerce.date() ).optional(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, listBroadcasts);

  try {
    const { page, limit, from, to } = await getValidatedQuery(event, broadcastsGetQuerySchema.parse);
    const [count, result] = await Promise.all([
      db.$count(broadcastsTable, and(
        from ? gte(broadcastsTable.createdAt, from) : undefined,
        to ? lte(broadcastsTable.createdAt, to) : undefined,
      )),
      db.select()
        .from(broadcastsTable)
        .where(
          and(
            from ? gte(broadcastsTable.createdAt, from) : undefined,
            to ? lte(broadcastsTable.createdAt, to) : undefined,
          )
        )
        .limit(limit)
        .offset((page*limit)-limit)
        .orderBy(desc(broadcastsTable.createdAt))
    ]);
    return {
      count,
      result: result
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});