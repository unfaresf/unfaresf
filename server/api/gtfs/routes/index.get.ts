import { getGtfs } from "../../../../shared/utils/abilities";
import { gtfsDB } from "../../../sqlite-service";
import {
  routes,
  agency,
  directions,
  trips,
} from "../../../../db/gtfs-migrations/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const getRoutes = (agencyId: string) => {
  return gtfsDB
    .selectDistinct({
      routeId: routes.routeId,
      routeShortName: routes.routeShortName,
      routeLongName: routes.routeLongName,
      agencyId: routes.agencyId,
      agencyName: agency.agencyName,
      direction: directions.direction,
      directionId: directions.directionId,
    })
    .from(routes)
    .innerJoin(agency, eq(routes.agencyId, agency.agencyId))
    .innerJoin(directions, eq(directions.routeId, routes.routeId))
    .where(agencyId ? eq(agency.agencyId, agencyId) : undefined)
    .orderBy(routes.routeShortName, directions.directionId);
};

const getRoutesWithHeadsign = (agencyId: string) => {
  const baseRoutes = gtfsDB.$with("base_routes").as(
    gtfsDB
      .select({
        routeId: routes.routeId,
        routeShortName: routes.routeShortName,
        routeLongName: routes.routeLongName,
        agencyId: routes.agencyId,
        agencyName: agency.agencyName,
        direction: directions.direction,
        directionId: directions.directionId,
      })
      .from(routes)
      .innerJoin(agency, eq(routes.agencyId, agency.agencyId))
      .innerJoin(directions, eq(directions.routeId, routes.routeId))
      .where(eq(agency.agencyId, agencyId))
  );

  const filteredTrips = gtfsDB.$with("filtered_trips").as(
    gtfsDB
      .selectDistinct({
        routeId: trips.routeId,
        directionId: trips.directionId,
        tripHeadsign: trips.tripHeadsign,
      })
      .from(trips)
  );

  return gtfsDB
    .with(baseRoutes, filteredTrips)
    .select({
      routeId: baseRoutes.routeId,
      routeShortName: baseRoutes.routeShortName,
      routeLongName: baseRoutes.routeLongName,
      agencyId: baseRoutes.agencyId,
      agencyName: baseRoutes.agencyName,
      direction: baseRoutes.direction,
      directionId: baseRoutes.directionId,
      headsign: filteredTrips.tripHeadsign,
    })
    .from(baseRoutes)
    .innerJoin(
      filteredTrips,
      and(
        eq(baseRoutes.routeId, filteredTrips.routeId),
        eq(baseRoutes.directionId, filteredTrips.directionId)
      )
    )
    .orderBy(baseRoutes.routeShortName, filteredTrips.tripHeadsign);
};

const gtfsGetRouteByAgencySchema = z.object({
  agencyId: z.string().trim().max(32),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { agencyId } = await getValidatedQuery(
    event,
    gtfsGetRouteByAgencySchema.parse
  );

  try {
    return getRoutesWithHeadsign(agencyId);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
    });
  }
});
