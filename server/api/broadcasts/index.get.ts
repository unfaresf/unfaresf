import { desc, gte, lte, and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { gtfsDB, DB as db } from "../../sqlite-service";
import { reports as reportsTable, broadcasts as broadcastsTable } from "../../../db/schema";
import { stopTimes as stopTimesTable, trips as tripsTable, routes as routesTable} from "../../../db/gtfs-migrations/schema";
import { listBroadcasts } from "../../../shared/utils/abilities";
import { z } from "zod";

const broadcastsGetQuerySchema = z.object({
  page: z.number({ coerce: true }).min(0).int().default(0),
  limit: z.number({ coerce: true }).min(0).max(100).int().default(20),
  from: z.string().datetime().pipe( z.coerce.date() ).optional(),
  to: z.string().datetime().pipe( z.coerce.date() ).optional(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, listBroadcasts);

  try {
    const { page, limit, from, to } = await getValidatedQuery(event, broadcastsGetQuerySchema.parse);

    const [count, broadcasts] = await Promise.all([
      db.$count(broadcastsTable, and(
        from ? gte(broadcastsTable.createdAt, from) : undefined,
        to ? lte(broadcastsTable.createdAt, to) : undefined,
      )),
      db.select({
        ...getTableColumns(broadcastsTable),
        route: reportsTable.route,
        stop: reportsTable.stop,
        passenger: reportsTable.passenger,
      })
        .from(broadcastsTable)
        .innerJoin(reportsTable, eq(reportsTable.id, broadcastsTable.reportId))
        .where(
          and(
            from ? gte(broadcastsTable.createdAt, from) : undefined,
            to ? lte(broadcastsTable.createdAt, to) : undefined,
          )
        )
        .limit(limit)
        .offset((page*limit)-limit)
        .orderBy(desc(broadcastsTable.createdAt))
    ]);

    // GTFS data is in a different DB so this join must be done in the app layer
    const stopRoutesIntersection = await gtfsDB
      .selectDistinct({
        stopId: stopTimesTable.stopId,
        routeShortName: routesTable.routeShortName,
      })
      .from(stopTimesTable)
      .innerJoin(tripsTable, eq(tripsTable.tripId, stopTimesTable.tripId))
      .innerJoin(routesTable, eq(routesTable.routeId, tripsTable.routeId))
      .where(inArray(stopTimesTable.stopId, broadcasts.map(r => r.stop.stopId)));

    const stopRoutesObj = stopRoutesIntersection.reduce<Record<string, string[]>>((accum, stop) => {
      if (stop.routeShortName !== null) {
        const stopId = stop.stopId;
        if (accum[stopId]) {
          accum[stopId].push(stop.routeShortName);
        } else {
          accum[stop.stopId] = [stop.routeShortName];
        }
      }
      return accum;
    }, {});

    const result = broadcasts.map(broadcast => {
      const stopId = broadcast.stop.stopId;
      if (stopId && stopRoutesObj[stopId]) {
        broadcast.stop.routes = stopRoutesObj[stopId];
      }
      return broadcast;
    });

    return {
      count,
      result
    }
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});