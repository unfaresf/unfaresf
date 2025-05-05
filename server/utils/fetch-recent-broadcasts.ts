import { and, desc, gte, eq, isNotNull } from 'drizzle-orm';
import { DB as db, gtfsDB } from "../sqlite-service";
import { broadcasts as broadcastsTable, reports as reportsTable, type SelectReport } from "../../db/schema";
import { subHours } from 'date-fns';

type RecentlyBroadcastReports = {
  reportId: SelectReport['id'];
  route: NonNullable<SelectReport['route']>;
  stop: NonNullable<SelectReport['stop']>;
};

export default async function fetchRecentlyBroadcastReports(windowLength: number):Promise<RecentlyBroadcastReports[]> {
  // @ts-ignore the isNotNull checks dont get picked up by the TS types
  return db.select({
    reportId: reportsTable.id,
    route: reportsTable.route,
    stop: reportsTable.stop,
  })
  .from(reportsTable)
  .leftJoin(broadcastsTable, eq(broadcastsTable.reportId, reportsTable.id))
  .where(
    and(
      gte(broadcastsTable.createdAt, subHours(new Date(), windowLength)),
      isNotNull(reportsTable.route),
      isNotNull(reportsTable.stop),
    ),
  )
  .orderBy(desc(broadcastsTable.createdAt))
  .limit(20);
}