import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service"
import { reports as reportsTable } from "../../../db/schema";
import { z } from "zod";

const reportsPutRouteParamSchema = z.object({
  id: z.number({ coerce: true }).positive().int()
});

const reportsPutRouteBodySchema = z.object({
  approved: z.boolean({ coerce: true })
});

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, reportsPutRouteParamSchema.parse);
  const { approved } = await readValidatedBody(event, reportsPutRouteBodySchema.parse);

  try {
    return await db.update(reportsTable)
      .set({
        approved,
        reviewedAt: new Date(),
      })
      .where(eq(reportsTable.id, id))
      .returning({
        id: reportsTable.id,
        approved: reportsTable.approved,
        reviewedAt: reportsTable.reviewedAt,
      });
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});