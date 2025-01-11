import { DB as db } from "../sqlite-service"
import { reports as reportsTable, reportInsertSchema } from "../../db/schema";
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const defaultRepost = {
    sourceId: uuidv4(),
    source: 'internal',
  };
  const body = await readBody(event)
  const report = {
    ...defaultRepost,
    message: body.message,
  };
  if (report.message.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Message missing"
    });
  }
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