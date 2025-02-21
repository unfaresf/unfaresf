import { and, desc, gte, eq, isNotNull, inArray } from 'drizzle-orm';
import { DB as db, gtfsDB } from "../../sqlite-service";
import { broadcasts as broadcastsTable, reports as reportsTable, type SelectReport } from "../../../db/schema";
import { stops as stopsTable } from "../../../db/gtfs-migrations/schema";
import { listBroadcastsGeo } from "../../../shared/utils/abilities";
import { subHours } from 'date-fns';
import { BBox } from "geojson";
import { getRouteTrips } from "../../utils/routes-cache";

const SHIFT_LENGTH = 8;

const mergeBoundingBoxes = (boundingBoxes: BBox[]): [number, number, number, number] => {
  let minLeft = 180;
  let minBottom = 90;
  let maxRight = -180;
  let maxTop = -90;

  boundingBoxes.forEach(([left, bottom, right, top]) => {
    if (left < minLeft) minLeft = left;
    if (bottom < minBottom) minBottom = bottom;
    if (right > maxRight) maxRight = right;
    if (top > maxTop) maxTop = top;
  });

  return [minLeft, minBottom, maxRight, maxTop];
};

type RecentlyBroadcastReports = {
  reportId: SelectReport['id'];
  route: NonNullable<SelectReport['route']>;
  stop: NonNullable<SelectReport['stop']>;
};

async function fetchRecentlyBroadcastReports():Promise<RecentlyBroadcastReports[]> {
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
      gte(broadcastsTable.createdAt, subHours(new Date(), SHIFT_LENGTH)),
      isNotNull(reportsTable.route),
      isNotNull(reportsTable.stop),
    ),
  )
  .orderBy(desc(broadcastsTable.createdAt))
  .limit(20);
}

type StopById = {
  stopId: string;
  stopLon: number;
  stopLat: number;
}
async function fetchStopsById(stopIds:string[]):Promise<StopById[]> {
  // @ts-ignore
  return gtfsDB
  .select({
    stopId: stopsTable.stopId,
    stopLon: stopsTable.stopLon,
    stopLat: stopsTable.stopLat,
  })
  .from(stopsTable)
  .where(
    and(
      inArray(stopsTable.stopId, stopIds),
      isNotNull(stopsTable.stopLon),
      isNotNull(stopsTable.stopLat),
    )
  );
}

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, listBroadcastsGeo);

  try {
    const reports = await fetchRecentlyBroadcastReports();
    const stopIds = reports.filter(r => !!r.stop).map(r => r.stop.stopId);
    const gettingsRoutesBBoxes = Promise.all(
      reports
      .map(report => {
        return getRouteTrips(report.route.routeId);
      })
    );
    const gettingStops = fetchStopsById(stopIds);

    const [stopPositions, bBoxedRoutes] = await Promise.all([gettingStops, gettingsRoutesBBoxes]);
    const superBBox = mergeBoundingBoxes(bBoxedRoutes.map(r => r?.bbox));

    return {
      bbox: superBBox,
      routes: bBoxedRoutes,
      stops: stopPositions,
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});