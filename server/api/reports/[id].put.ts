import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service"
import { reports as reportsTable } from "../../../db/schema";
import { z } from "zod";
import { updateReports } from "../../../shared/utils/abilities";

const reportsPutRouteParamSchema = z.object({
  id: z.number({ coerce: true }).positive().int()
});

export default defineEventHandler(async (event) => {
  await authorize(event, updateReports);

  const { id } = await getValidatedRouterParams(event, reportsPutRouteParamSchema.parse);

  try {
    return await db.update(reportsTable)
      .set({
        reviewedAt: new Date(),
      })
      .where(eq(reportsTable.id, id))
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