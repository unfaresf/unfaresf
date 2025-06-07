import { getGtfs } from "../../../../shared/utils/abilities";
import { gtfsDB } from "../../../sqlite-service";
import {
  routes,
  agency,
  directions,
  stops,
  stopTimes,
  trips,
} from "../../../../db/gtfs-migrations/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const getStops = (routeId: string, directionId: number) => {
  return gtfsDB
    .selectDistinct({
      stopId: stops.stopId,
      stopName: stops.stopName,
      direction: directions.direction,
      directionId: directions.directionId,
    })
    .from(stops)
    .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
    .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
    .innerJoin(routes, eq(routes.routeId, trips.routeId))
    .innerJoin(
      directions,
      and(
        eq(directions.directionId, trips.directionId),
        eq(routes.routeId, directions.routeId)
      )
    )
    .where(
      and(eq(routes.routeId, routeId), eq(directions.directionId, directionId))
    )
    .orderBy(stopTimes.stopSequence, stops.stopName, directions.directionId);
};

const gtfsGetStopsByRoute = z.object({
  routeId: z.string().trim().max(32),
  directionId: z.number({ coerce: true }),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { routeId, directionId } = await getValidatedQuery(
    event,
    gtfsGetStopsByRoute.parse
  );

  try {
    return getStops(routeId, directionId);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
    });
  }
});
