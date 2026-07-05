import { describe, it, expect } from 'vitest';
import {
  buildRouteFeature,
  buildStopFeature,
  type RouteMeta,
  type ShapePointRow,
} from '../../server/utils/route-geometry';

const meta: RouteMeta = {
  routeId: 'R1',
  agencyId: 'AG',
  routeShortName: '38',
  routeLongName: 'Geary',
  routeColor: 'ff0000',
  routeTextColor: 'ffffff',
};

describe('buildRouteFeature', () => {
  it('groups points into one line per shape, preserving order', () => {
    const points: ShapePointRow[] = [
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S1', lon: -122.2, lat: 37.2 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ];
    const feature = buildRouteFeature(meta, points);
    expect(feature).not.toBeNull();
    expect(feature!.geometry.type).toBe('MultiLineString');
    expect(feature!.geometry.coordinates).toEqual([
      [[-122.1, 37.1], [-122.2, 37.2]],
      [[-122.3, 37.3], [-122.4, 37.4]],
    ]);
    expect(feature!.id).toBe('R1');
    expect(feature!.properties).toMatchObject({
      route_id: 'R1',
      route_short_name: '38',
      route_long_name: 'Geary',
      route_color: 'ff0000',
      route_text_color: 'ffffff',
      agency_id: 'AG',
    });
  });

  it('returns null when there are no points', () => {
    expect(buildRouteFeature(meta, [])).toBeNull();
  });

  it('drops shapes with fewer than 2 points', () => {
    const points: ShapePointRow[] = [
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ];
    const feature = buildRouteFeature(meta, points);
    expect(feature!.geometry.coordinates).toEqual([
      [[-122.3, 37.3], [-122.4, 37.4]],
    ]);
  });
});

describe('buildStopFeature', () => {
  it('builds a Point feature with stop properties', () => {
    const feature = buildStopFeature({ stopId: 'ST1', stopName: 'Main & 1st', lon: -122.5, lat: 37.5 });
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [-122.5, 37.5] });
    expect(feature.id).toBe('ST1');
    expect(feature.properties).toEqual({ stop_id: 'ST1', stop_name: 'Main & 1st' });
  });
});
