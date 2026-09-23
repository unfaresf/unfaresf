import { DB as db } from "../sqlite-service"
import { reports as reportsTable, broadcasts as broadcastsTable, type InsertReport, type SelectReport } from "../../db/schema";
import Notify from "./notify";
import getPlainTextSummary from '#shared/utils/get-plain-text-summary';
import type { H3Event, EventHandlerRequest } from 'h3';

type CreateReportArgs = {
  reports: InsertReport[],
  event?: H3Event<EventHandlerRequest>,
  options?: ControllerOptions,
};

// Inserts the reports already reviewed, each with a broadcast built from its
// plain-text summary (the same message the Post button sends). better-sqlite3
// transactions must be synchronous, hence .all()/.run() instead of await.
function insertBroadcastReports(reports: InsertReport[]): SelectReport[] {
  return db.transaction((tx) => {
    const reviewedAt = new Date();
    const created = tx.insert(reportsTable)
      .values(reports.map(report => ({ ...report, reviewedAt })))
      .returning()
      .all();
    tx.insert(broadcastsTable)
      .values(created.map(report => ({ reportId: report.id, message: getPlainTextSummary(report) })))
      .run();
    return created;
  });
}

export default async function CreateReport(args:CreateReportArgs):Promise<SelectReport[]> {
  const broadcast = args.options?.broadcast ?? false;
  // broadcast reports are already handled, so there's nothing to push about
  const quiet = broadcast || (args.options?.quiet ?? false);
  const newlyCreatedReports = broadcast
    ? insertBroadcastReports(args.reports)
    : await db.insert(reportsTable).values(args.reports).returning();

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
