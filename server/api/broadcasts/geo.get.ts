import { and, isNotNull, inArray } from 'drizzle-orm';
import { gtfsDB } from "../../sqlite-service";
import { stops as stopsTable } from "../../../db/gtfs-migrations/schema";
import { listBroadcastsGeo } from "../../../shared/utils/abilities";
import { BBox } from "geojson";
import { getRouteTrips } from "../../utils/routes-cache";
import fetchRecentlyBroadcastReports from '../../utils/fetch-recent-broadcasts';

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
  const { public: {shiftLength} } = useRuntimeConfig();

  try {
    const reports = await fetchRecentlyBroadcastReports(shiftLength);
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