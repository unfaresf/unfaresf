import { getGtfs } from "../../../../shared/utils/abilities";
import { gtfsDB } from "../../../sqlite-service";
import {
  routes,
  agency,
  directions,
} from "../../../../db/gtfs-migrations/schema";
import { eq } from "drizzle-orm";
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
    .where(agencyId ? eq(agency.agencyId, agencyId) : undefined);
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
    return getRoutes(agencyId);
  } catch (err: any) {
    throw createError({
      statusCode: 500,
    });
  }
});
