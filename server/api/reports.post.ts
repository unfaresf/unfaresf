import { DB as db } from "../sqlite-service"
import { reports as reportsTable, reportInsertSchema } from "../../db/schema";
import { createReports } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  await authorize(event, createReports);

  const defaultRepost = {
    source: 'internal',
  };
  const body = await readValidatedBody(event, reportInsertSchema.pick({
    route: true,
    stop: true,
    direction: true,
    passenger: true,
  }).parse);
  const report = {
    ...defaultRepost,
    ...body
  };

  try {
    return db.insert(reportsTable).values(report);
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});