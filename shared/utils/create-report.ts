import { DB as db } from "../../server/sqlite-service"
import { reports as reportsTable, type InsertReport, type SelectReport } from "../../db/schema";
import Notify from "./notify";
import type { H3Event, EventHandlerRequest } from 'h3';

export default async function CreateReport(
  event:H3Event<EventHandlerRequest>,
  report:InsertReport,
  options:ControllerOptions = {}
):Promise<SelectReport> {
  const { quiet } = options;
  const [newlyCreatedReport] = await db.insert(reportsTable).values(report).returning();

  if (!quiet) {
    event.waitUntil(Notify(event, newlyCreatedReport));
  }

  return newlyCreatedReport;
}