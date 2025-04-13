import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, agency, directions, stops, stopTimes, trips, calendar } from "../../../../db/gtfs-migrations/schema";
import { like, lt, eq, or, and, inArray, sql, asc } from "drizzle-orm";

const ROUTE_RESULTS_LIMIT = 15;
const calendarDayCols = [calendar.sunday,calendar.monday,calendar.tuesday,calendar.wednesday,calendar.thursday,calendar.friday,calendar.saturday]

// https://github.com/coollabsio/coolify/issues/1919#issuecomment-2026080171
function unescapeJsonString(possiblyEscapedJsonString:string):Record<string, string>{
  let correctedString = possiblyEscapedJsonString;

  // Check and conditionally remove leading and trailing single quotes
  if (correctedString.startsWith("'") && correctedString.endsWith("'")) {
    correctedString = correctedString.slice(1, -1);
  }

  // Replace escaped double quotes with actual double quotes only if needed
  if (correctedString.includes('\\"')) {
    correctedString = correctedString.replace(/\\"/g, '"');
  }

  // Replace escaped newlines with actual newline characters only if needed
  if (correctedString.includes("\\\\n")) {
    correctedString = correctedString.replace(/\\\\n/g, "\\n");
  }

  // Attempt to parse the corrected string into a JSON object
  try {
    return JSON.parse(correctedString);
  } catch (error) {
    throw new Error(`Error un-escaping JSON string: ${error}`);
  }
}

const gtfsGetRouteQuerySchema = z.object({
  q: z.string().trim().max(32).optional(),
  latitude: z.number({ coerce: true }).optional(),
  longitude: z.number({ coerce: true }).optional(),
});

function getAngecyIdFromAltName(query?:string):string[] {
  if (!query) return [];
  const altNames = getAltAgencyNames();
  return Object.entries(altNames).filter(([key]) => query.includes(key)).map(([key, value]) => value);
}

function removeAgencyAltNamesFromQuery(query?:string):string {
  if (!query) return '';
  const altNames = getAltAgencyNames();
  return Object.keys(altNames).reduce((memo, altName) => {
    return memo.replaceAll(altName, '');
  }, query).replace(/\s+/g, ' ').trim();
}

function getAltAgencyNames():Record<string, string>{
  const { agencyAltNames: agencyAltNamesString } = useRuntimeConfig();

  try {
    return agencyAltNamesString ? unescapeJsonString(agencyAltNamesString) : {};
  } catch(err) {
    console.warn('Error parsing altAgencyNames env var', err);
    return {}
  }
}

async function getRoutesByLocation(q:string, agencyIds:string[], lat:number, lng:number) {
  const maxDistance = 500; // 500 meters
  const subquery = gtfsDB.select({
    stopId: stops.stopId,
    distance: sql<number>`(
      6371000 * acos (
      cos ( radians(${lat}) )
      * cos( radians( stop_lat ) )
      * cos( radians( stop_lon ) - radians(${lng}) )
      + sin ( radians(${lat}) )
      * sin( radians( stop_lat ) )
      )
    )`
  })
  .from(stops)
  .where(({distance}) => lt(distance, maxDistance))
  .orderBy(({distance}) => asc(distance))
  .limit(30)
  .as('stops');

  return gtfsDB
    .selectDistinct({
      routeId: routes.routeId,
      routeShortName: routes.routeShortName,
      routeLongName: routes.routeLongName,
      agencyId: routes.agencyId,
      agencyName: agency.agencyName,
      direction: directions.direction,
    })
    .from(subquery)
    .innerJoin(stopTimes, eq(stopTimes.stopId, stops.stopId))
    .innerJoin(trips, eq(trips.tripId, stopTimes.tripId))
    .innerJoin(routes, eq(routes.routeId, trips.routeId))
    .innerJoin(agency, eq(agency.agencyId, routes.agencyId))
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
    .limit(ROUTE_RESULTS_LIMIT);
}

async function getRoutes(query:string, agencyIds:string[]) {
  const queryTokens = query?.split(/\s+/) || [];
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
        (agencyIds.length ? inArray(agency.agencyId, agencyIds) : undefined),
        ...queryTokens.map(token => or(
            like(routes.routeShortName, `%${token}%`),
            like(routes.routeLongName, `%${token}%`),
          )
        )
      )
    )
    .limit(ROUTE_RESULTS_LIMIT);
}

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { q: rawQuery, latitude, longitude } = await getValidatedQuery(event, gtfsGetRouteQuerySchema.parse);
  const agencyIds = getAngecyIdFromAltName(rawQuery);
  const q = removeAgencyAltNamesFromQuery(rawQuery);
  try {
    if (latitude !== undefined && longitude !== undefined) {
      const routeResults = await getRoutesByLocation(q, agencyIds, latitude, longitude);
      if (routeResults.length) return routeResults;
    }
    return getRoutes(q, agencyIds);
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});