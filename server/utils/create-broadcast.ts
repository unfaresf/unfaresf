import { and, eq, isNull } from "drizzle-orm";
import { DB as db } from "../sqlite-service";
import { reports as reportsTable, broadcasts as broadcastsTable, type InsertReport } from "../../db/schema";

// The details a reviewer fills in for an external-source (e.g. Mastodon) report.
export type ReviewDetails = Partial<Pick<InsertReport, "route" | "stop" | "passenger">>;

type CreateBroadcastArgs = {
  reportId: number,
  message: string,
  details?: ReviewDetails,
};

export class ReportAlreadyReviewedError extends Error {
  constructor(reportId: number) {
    super(`Report ${reportId} was already reviewed`);
  }
}

// Marks the report reviewed (saving any reviewed details) and creates its
// broadcast in one transaction, so a failed broadcast never leaves the report
// reviewed with nothing sent and no way to retry. Only an unreviewed report can
// be broadcast: the first reviewer to post or dismiss it wins. better-sqlite3
// transactions must be synchronous, hence .run() instead of await.
export default function CreateBroadcast({ reportId, message, details = {} }: CreateBroadcastArgs) {
  db.transaction((tx) => {
    const reviewed = tx.update(reportsTable)
      .set({ ...details, reviewedAt: new Date() })
      .where(and(eq(reportsTable.id, reportId), isNull(reportsTable.reviewedAt)))
      .run();
    if (!reviewed.changes) throw new ReportAlreadyReviewedError(reportId);
    tx.insert(broadcastsTable).values({ reportId, message }).run();
  });
}
