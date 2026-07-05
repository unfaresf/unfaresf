import { describe, it, expect } from 'vitest';
import {
  createGtfsFixture,
  seedRoute,
  seedTrip,
  seedShape,
  seedStop,
} from '../../test/gtfs-fixture';
import {
  fetchRouteMeta,
  fetchRouteShapePoints,
  fetchStopRow,
  getRouteFeature,
  getStopFeature,
} from './gtfs-map-features';

describe('fetchRouteShapePoints', () => {
  it('returns distinct shapes for a route, ordered by shape then sequence', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedShape(sqlite, 'S2', [[-122.3, 37.3], [-122.4, 37.4]]);
    // Two trips share S1 — the shape's points must NOT be duplicated.
    seedTrip(sqlite, 'T1', 'R1', 'S1');
    seedTrip(sqlite, 'T2', 'R1', 'S1');
    seedTrip(sqlite, 'T3', 'R1', 'S2');

    const points = await fetchRouteShapePoints('R1', db);

    expect(points).toEqual([
      { shapeId: 'S1', lon: -122.1, lat: 37.1 },
      { shapeId: 'S1', lon: -122.2, lat: 37.2 },
      { shapeId: 'S2', lon: -122.3, lat: 37.3 },
      { shapeId: 'S2', lon: -122.4, lat: 37.4 },
    ]);
  });

  it('returns an empty array for an unknown route', async () => {
    const { db } = createGtfsFixture();
    expect(await fetchRouteShapePoints('NOPE', db)).toEqual([]);
  });
});

describe('fetchRouteMeta', () => {
  it('returns route metadata or null', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', agencyId: 'AG', routeShortName: '38', routeLongName: 'Geary' });

    expect(await fetchRouteMeta('R1', db)).toEqual({
      routeId: 'R1',
      agencyId: 'AG',
      routeShortName: '38',
      routeLongName: 'Geary',
      routeColor: null,
      routeTextColor: null,
    });
    expect(await fetchRouteMeta('NOPE', db)).toBeNull();
  });
});

describe('fetchStopRow', () => {
  it('returns a stop row or null', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedStop(sqlite, 'ST1', 'Main & 1st', -122.5, 37.5);

    expect(await fetchStopRow('ST1', db)).toEqual({
      stopId: 'ST1',
      stopName: 'Main & 1st',
      lon: -122.5,
      lat: 37.5,
    });
    expect(await fetchStopRow('NOPE', db)).toBeNull();
  });
});

describe('getRouteFeature', () => {
  it('builds a MultiLineString feature for a route', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38', routeColor: 'ff0000' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedTrip(sqlite, 'T1', 'R1', 'S1');

    const feature = await getRouteFeature('R1', db);
    expect(feature!.geometry.type).toBe('MultiLineString');
    expect(feature!.geometry.coordinates).toEqual([[[-122.1, 37.1], [-122.2, 37.2]]]);
    expect(feature!.properties!.route_id).toBe('R1');
  });

  it('returns null for an unknown route', async () => {
    const { db } = createGtfsFixture();
    expect(await getRouteFeature('NOPE', db)).toBeNull();
  });
});

describe('getStopFeature', () => {
  it('builds a Point feature for a stop', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedStop(sqlite, 'ST1', 'Main & 1st', -122.5, 37.5);

    const feature = await getStopFeature('ST1', db);
    expect(feature!.geometry).toEqual({ type: 'Point', coordinates: [-122.5, 37.5] });
    expect(feature!.properties!.stop_id).toBe('ST1');
  });

  it('returns null for an unknown stop', async () => {
    const { db } = createGtfsFixture();
    expect(await getStopFeature('NOPE', db)).toBeNull();
  });
});
