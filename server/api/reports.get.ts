import { desc, isNull, isNotNull } from 'drizzle-orm';
import { DB as db } from "../sqlite-service";
import { reports as reportsTable } from "../../db/schema";
import { listReports } from "../../shared/utils/abilities";
import { z } from "zod";

const reportsPutRouteQuerySchema = z.object({
  reviewed: z.optional(z.preprocess(val => {
    if (typeof val === "string") {
        if (val.toLowerCase() === "true") return true;
        if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean())),
  page: z.number({ coerce: true }).min(0).int().default(0),
  limit: z.number({ coerce: true }).min(0).max(100).int().default(20),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, listReports);
  const { reviewed, page, limit } = await getValidatedQuery(event, reportsPutRouteQuerySchema.parse);
  const reviewedFilter = reviewed === undefined ? undefined : reviewed ? isNotNull(reportsTable.reviewedAt) : isNull(reportsTable.reviewedAt);
  try {
    const [count, result] = await Promise.all([
      db.$count(reportsTable, reviewedFilter),
      db.select()
        .from(reportsTable)
        .limit(limit)
        .offset((page*limit)-limit)
        .where(reviewedFilter)
        .orderBy(desc(reportsTable.createdAt))
    ]);
    if (result) {
      return {
        count,
        result
      }
    }
    return [];
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});