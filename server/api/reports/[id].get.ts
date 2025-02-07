import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service"
import { reports as reportsTable } from "../../../db/schema";
import { z } from "zod";
import { getReport } from "../../../shared/utils/abilities";

const reportsGetRouteParamSchema = z.object({
  id: z.number({ coerce: true }).positive().int()
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getReport);

  const { id } = await getValidatedRouterParams(event, reportsGetRouteParamSchema.parse);

  try {
    const report = await db.query.reports.findFirst({
      where: eq(reportsTable.id, id)
    });

    if (report) return report;
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  });
});