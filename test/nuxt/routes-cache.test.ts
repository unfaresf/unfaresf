import { describe, it, expect } from 'vitest';
import { bbox } from '@turf/turf';
import { lineString } from '@turf/turf';
import {
  createGtfsFixture,
  seedRoute,
  seedTrip,
  seedShape,
} from '../gtfs-fixture';
import { getRouteTrips } from '../../server/utils/routes-cache';

describe('getRouteTrips', () => {
  it('returns the route row with a bbox computed from its shapes', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R1', routeShortName: '38' });
    seedShape(sqlite, 'S1', [[-122.1, 37.1], [-122.2, 37.2]]);
    seedTrip(sqlite, 'T1', 'R1', 'S1');

    const result = await getRouteTrips('R1', db);

    expect(result.routeId).toBe('R1');
    const expected = bbox(lineString([[-122.1, 37.1], [-122.2, 37.2]]));
    expect(result.bbox).toEqual(expected);
  });

  it('falls back to the default bbox when a route has no shapes', async () => {
    const { db, sqlite } = createGtfsFixture();
    seedRoute(sqlite, { routeId: 'R2', routeShortName: 'X' });

    const result = await getRouteTrips('R2', db);
    expect(result.bbox).toEqual([180, 90, -180, -90]);
  });
});
