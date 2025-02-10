import { DB as db } from "../../server/sqlite-service"
import { reports as reportsTable, type InsertReport, type SelectReport } from "../../db/schema";
import Notify from "./notify";
import type { H3Event, EventHandlerRequest } from 'h3';

type CreateReportArgs = {
  reports: InsertReport[],
  event?: H3Event<EventHandlerRequest>,
  options?: ControllerOptions,
};

export default async function CreateReport(args:CreateReportArgs):Promise<SelectReport[]> {
  const quiet = args.options?.quiet ?? false;
  const newlyCreatedReports = await db.insert(reportsTable).values(args.reports).returning();

  if (!quiet) {
    if (args.event) {
      args.event.waitUntil(Notify(newlyCreatedReports));
    } else {
      const notifySettlements = await Notify(newlyCreatedReports);
      notifySettlements.filter(s => s.status === "rejected").forEach(s => console.error(s.reason));
    }
  }

  return newlyCreatedReports;
}