import { gtfsDB } from "../sqlite-service";
import { routes, shapes, calendar, trips } from "../../db/gtfs-migrations/schema";
import { eq, and, sql, asc, isNotNull } from "drizzle-orm";
import { lineString, featureCollection, bbox } from '@turf/turf';

const calendarDayCols = [calendar.sunday,calendar.monday,calendar.tuesday,calendar.wednesday,calendar.thursday,calendar.friday,calendar.saturday]

function getBboxForTrips(trips:{
  line: number[][];
  tripId: string;
  routeId: string;
  shapeId: string;
}[]) {
  return bbox(featureCollection(trips.map(t => lineString(t.line))))
}

async function getTrips(routeId:string) {
  const routeTrips = gtfsDB.select({
    routeId: routes.routeId,
    agencyId: routes.agencyId,
    routeShortName: routes.routeShortName,
    routeLongName: routes.routeLongName,
    routeColor: routes.routeColor,
    routeTextColor: routes.routeTextColor,
    tripId: trips.tripId,
    directionId: trips.directionId,
    shapeId: trips.shapeId,
  })
  .from(trips)
  .innerJoin(routes, eq(routes.routeId, trips.routeId))
  .innerJoin(calendar, eq(calendar.serviceId, trips.serviceId))
  .where(
    and(
      eq(trips.routeId, routeId),
      eq(calendarDayCols[new Date().getDay()], 1)
    )
  ).as('routeTrips');

  const tripResults = await gtfsDB.select({
    routeId: routeTrips.routeId,
    agencyId: routeTrips.agencyId,
    routeShortName: routeTrips.routeShortName,
    routeLongName: routeTrips.routeLongName,
    routeColor: routeTrips.routeColor,
    routeTextColor: routeTrips.routeTextColor,
    tripId: routeTrips.tripId,
    directionId: routeTrips.directionId,
    shapeId: shapes.shapeId,
    line: sql<string>`'[' || GROUP_CONCAT('[' || ${shapes.shapePtLon} || ',' || ${shapes.shapePtLat} || ']', ',') || ']'`.as('line')
  })
  .from(shapes)
  .innerJoin(routeTrips, eq(routeTrips.shapeId, shapes.shapeId))
  .where(and(
    isNotNull(shapes.shapePtLat),
    isNotNull(shapes.shapePtLon)
  ))
  .groupBy(shapes.shapeId)
  .orderBy(asc(shapes.shapePtSequence));

  return tripResults.map((trip) => {
    return {
      ...trip,
      line: JSON.parse(trip.line) as number[][]
    }
  });
}

async function getRoute(id:string) {
  const [route] = await gtfsDB
    .select()
    .from(routes)
    .where(
      eq(routes.routeId, id)
    )
    .limit(1);
  return route;
}

export async function getRouteTrips(id:string) {
  const [r, t] = await Promise.all([
    getRoute(id),
    getTrips(id),
  ]);

  const bbox = getBboxForTrips(t);

  return {
    ...r,
    bbox
  }
}
