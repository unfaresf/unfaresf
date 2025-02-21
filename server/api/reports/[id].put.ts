import { eq, and, isNull } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service"
import { reports as reportsTable, reportInsertSchema } from "../../../db/schema";
import { z } from "zod";
import { updateReports } from "../../../shared/utils/abilities";

const reportsPutRouteParamSchema = z.object({
  id: z.number({ coerce: true }).positive().int()
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateReports);

  const { id } = await getValidatedRouterParams(event, reportsPutRouteParamSchema.parse);
  const body = await readValidatedBody(event, reportInsertSchema.pick({
    route: true,
    stop: true,
    passenger: true,
  }).parse);

  try {
    return await db.update(reportsTable)
      .set({
        reviewedAt: new Date(),
        ...body,
      })
      .where(
        and(
          eq(reportsTable.id, id),
          isNull(reportsTable.reviewedAt),
        )
      )
      .returning({
        id: reportsTable.id,
        reviewedAt: reportsTable.reviewedAt,
      });
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});