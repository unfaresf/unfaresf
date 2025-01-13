import { desc } from 'drizzle-orm';
import { DB as db } from "../sqlite-service";
import { reports as reportsTable } from "../../db/schema";
import { listReports } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  await authorize(event, listReports);

  const qp = getQuery(event);
  const offset = Number(qp.page) || 0;
  const limit = Number(qp.limit) < 100 ? Number(qp.limit) : 20;

  try {
    const result = await db.select()
      .from(reportsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(reportsTable.createdAt));
    if (result) {
      return result
    }
    return [];
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});