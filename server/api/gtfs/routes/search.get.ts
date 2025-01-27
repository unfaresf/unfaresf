import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, agency, directions } from "../../../../db/gtfs-migrations/schema";
import { like, eq, or, and, inArray } from "drizzle-orm";

const gtfsGetRouteQuerySchema = z.object({
  q: z.string().trim().nonempty().max(32)
});

function getAngecyIdFromAltname(query:string):string[] {
  const altNames = getAltAgencyNames();
  return Object.entries(altNames).filter(([key, value]) => query.includes(key)).map(([key, value]) => value);
}

function removeAgencyAltNamesFromQuery(query:string):string {
  const altNames = getAltAgencyNames();
  return Object.keys(altNames).reduce((memo, altName) => {
    return memo.replaceAll(altName, '');
  }, query).replace(/\s+/g, ' ').trim();
}

function getAltAgencyNames():Record<string, string>{
  const { agencyAltNames: agencyAltNamesString } = useRuntimeConfig();

  try {
    return JSON.parse(agencyAltNamesString);
  } catch(err) {
    console.warn('Error parsing altAgencyNames env var', err);
    return {}
  }
}

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { q: rawQuery } = await getValidatedQuery(event, gtfsGetRouteQuerySchema.parse);
  const agencyIds = getAngecyIdFromAltname(rawQuery);
  const q = removeAgencyAltNamesFromQuery(rawQuery);
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
        and(
          or(
            like(routes.routeShortName, `${q}%`),
            like(routes.routeLongName, `${q}%`)
          ),
          (agencyIds.length ? inArray(agency.agencyId, agencyIds) : undefined)
        )
      )
      .limit(10);
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});