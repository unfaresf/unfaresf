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
  const metaShapes = gtfsDB.select({
    shapeId: shapes.shapeId,
    line: sql<string>`'[' || GROUP_CONCAT('[' || ${shapes.shapePtLon} || ',' || ${shapes.shapePtLat} || ']', ',') || ']'`.as('line')
  })
  .from(shapes)
  .where(and(
    isNotNull(shapes.shapePtLat),
    isNotNull(shapes.shapePtLon)
  ))
  .groupBy(shapes.shapeId)
  .orderBy(asc(shapes.shapePtSequence))
  .as('metaShapes');

  const tripResults = await gtfsDB.select({
    tripId: trips.tripId,
    routeId: trips.routeId,
    shapeId: metaShapes.shapeId,
    line: metaShapes.line,
  })
  .from(trips)
  .innerJoin(metaShapes, eq(metaShapes.shapeId, trips.shapeId))
  .innerJoin(calendar, eq(calendar.serviceId, trips.serviceId))
  .where(
    and(
      eq(trips.routeId, routeId),
      eq(calendarDayCols[new Date().getDay()], 1)
    )
  );

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

export const cachedRouteResponses = defineCachedFunction(async (id: string) => {
  const [r, t] = await Promise.all([
    getRoute(id),
    getTrips(id),
  ])
  const bbox = getBboxForTrips(t);
  return {
    ...r,
    bbox
  }
}, {
  maxAge: 60,
  name: 'gtfs-routes',
  getKey: (id: string) => id
});