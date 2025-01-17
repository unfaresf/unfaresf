import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, stops, stopTimes, trips} from "../../../../db/gtfs-migrations/schema";
import { like, eq, and } from "drizzle-orm";

const gtfsGetStopsQuerySchema = z.object({
  q: z.string().trim().max(32).optional(),
  routeId: z.string().trim().nonempty().max(128)
});

export default defineEventHandler(async (event) => {
  await authorize(event, getGtfs);
  const { routeId, q } = await getValidatedQuery(event, gtfsGetStopsQuerySchema.parse);
  try {
    const result = await gtfsDB
      .selectDistinct({
        stopId: stops.stopId,
        stopCode: stops.stopCode,
        stopName: stops.stopName,
        stopLat: stops.stopLat,
        stopLon: stops.stopLon,
      })
      .from(stops)
      .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
      .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
      .innerJoin(routes, eq(routes.routeId, trips.routeId))
      .where(
        and(
          eq(routes.routeId, routeId),
          (q?.length ? like(stops.stopName, `%${q}%`) : undefined)
        )
      )
      .limit(300)
    return result;
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});