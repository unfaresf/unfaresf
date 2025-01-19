import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, agency, directions } from "../../../../db/gtfs-migrations/schema";
import { like, eq, or } from "drizzle-orm";

const gtfsGetRouteQuerySchema = z.object({
  q: z.string().trim().nonempty().max(32)
});

export default defineEventHandler(async (event) => {
  await authorize(event, getGtfs);
  const { q } = await getValidatedQuery(event, gtfsGetRouteQuerySchema.parse);
  try {
    return gtfsDB
      .selectDistinct({
        routeId: routes.routeId,
        routeShortName: routes.routeShortName,
        routeLongName: routes.routeLongName,
        agencyId: routes.agencyId,
        agencyName: agency.agencyName,
        direction: directions.direction,
      })
      .from(routes)
      .innerJoin(agency, eq(routes.agencyId, agency.agencyId))
      .innerJoin(directions, eq(directions.routeId, routes.routeId))
      .where(
        or(
          like(routes.routeShortName, `${q}%`),
          like(routes.routeLongName, `${q}%`)
        )
      )
      .limit(10);
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});