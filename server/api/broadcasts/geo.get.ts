import { and, isNotNull, inArray, eq } from 'drizzle-orm';
import { gtfsDB, DB as appDB } from "../../sqlite-service";
import { stops as stopsTable } from "../../../db/gtfs-migrations/schema";
import { integrations as integrationsTable } from "../../../db/schema";
import { listBroadcastsGeo } from "../../../shared/utils/abilities";
import { type BBox } from "geojson";
import { getRouteTrips } from "../../utils/routes-cache";
import fetchRecentlyBroadcastReports from '../../utils/fetch-recent-broadcasts';
import { bbox, point, featureCollection } from '@turf/turf';

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
    const integrations = await appDB.query.integrations.findFirst({where: eq(integrationsTable.name, 'map')});
    const reports = await fetchRecentlyBroadcastReports(shiftLength);
    const stopIds = reports.filter(r => !!r.stop).map(r => r.stop.stopId);
    const gettingsRoutesBBoxes = Promise.all(
      reports
      .filter(r => r.route)
      .map(report => getRouteTrips(report.route.routeId))
    );
    const gettingStops = fetchStopsById(stopIds);

    const [stopPositions, bBoxedRoutes] = await Promise.all([gettingStops, gettingsRoutesBBoxes]);
    const stopsBbox = bbox(featureCollection(stopPositions.map(stop => point([stop.stopLon, stop.stopLat]))));
    const routeBboxes = bBoxedRoutes.map(r => r?.bbox).concat([stopsBbox]);
    const superBBox = mergeBoundingBoxes(routeBboxes);

    return {
      defaultPosition: {
        // another discriminated type issue
        center: integrations?.options?.center,
        zoom: integrations?.options?.zoom,
      },
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