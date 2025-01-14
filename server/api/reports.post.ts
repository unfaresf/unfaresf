import { DB as db } from "../sqlite-service"
import { reports as reportsTable, reportInsertSchema } from "../../db/schema";
import { v4 as uuidv4 } from 'uuid';
import { createReports } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  await authorize(event, createReports);

  const defaultRepost = {
    sourceId: uuidv4(),
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

  const parsedReport = reportInsertSchema.parse(report);
  try {
    return db.insert(reportsTable).values(parsedReport);
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});