import type { Feature, MultiLineString, Point } from 'geojson';

export interface RouteMeta {
  routeId: string;
  agencyId: string | null;
  routeShortName: string | null;
  routeLongName: string | null;
  routeColor: string | null;
  routeTextColor: string | null;
}

export interface ShapePointRow {
  shapeId: string;
  lon: number;
  lat: number;
}

export interface StopRow {
  stopId: string;
  stopName: string | null;
  lon: number;
  lat: number;
}

// `points` must arrive grouped/ordered by (shapeId, shape_pt_sequence).
export function buildRouteFeature(
  meta: RouteMeta,
  points: ShapePointRow[],
): Feature<MultiLineString> | null {
  if (points.length === 0) return null;

  const lines = new Map<string, [number, number][]>();
  for (const p of points) {
    let line = lines.get(p.shapeId);
    if (!line) {
      line = [];
      lines.set(p.shapeId, line);
    }
    line.push([p.lon, p.lat]);
  }

  // A valid GeoJSON LineString needs at least two positions.
  const coordinates = [...lines.values()].filter((line) => line.length >= 2);
  if (coordinates.length === 0) return null;

  return {
    type: 'Feature',
    id: meta.routeId,
    geometry: { type: 'MultiLineString', coordinates },
    properties: {
      route_id: meta.routeId,
      route_short_name: meta.routeShortName,
      route_long_name: meta.routeLongName,
      route_color: meta.routeColor,
      route_text_color: meta.routeTextColor,
      agency_id: meta.agencyId,
    },
  };
}

export function buildStopFeature(stop: StopRow): Feature<Point> {
  return {
    type: 'Feature',
    id: stop.stopId,
    geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
    properties: {
      stop_id: stop.stopId,
      stop_name: stop.stopName,
    },
  };
}
