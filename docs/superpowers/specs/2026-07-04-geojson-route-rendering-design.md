# On-demand GeoJSON route & stop rendering

**Status:** Design — approved for planning
**Date:** 2026-07-04
**Repo:** unfaresf (nuxt app). gtfs-to-tiles is not modified by this work.

## Problem

The map ([components/routes-map.client.vue](../../../components/routes-map.client.vue)) renders transit routes and stops by loading two MapLibre **vector-tile** sources — `trips` and `stops` — from the tile server, then filtering them **client-side** by `route_id` / `stop_id`.

To display a handful of routes (a selected route plus routes with active broadcasts), MapLibre downloads the entire trips tileset across the viewport and zoom range and discards ~99% of it via layer filters. The stops source has the same shape. This is wasted bandwidth and CPU on the client, and it is the core cause of poor client-side map performance.

## Goal

Improve client-side performance by fetching **only the routes and stops actually displayed**, as GeoJSON, and letting MapLibre render them from a GeoJSON source instead of a filtered vector-tile source.

## Decisions (locked)

These were decided during brainstorming and are fixed inputs to the plan:

1. **Generation:** the per-route/per-stop GeoJSON is produced **on demand by the nuxt app** from its already-embedded GTFS SQLite DB, and cached. No precomputed static files, no upload step.
2. **Scope:** **both** the trips (routes) layer and the stops layer move off vector tiles.
3. **Route endpoint granularity:** **one route per request** (per-resource endpoint), not a batched `?ids=` endpoint.
4. **Stop endpoint granularity:** **one stop per request** (per-resource endpoint), keyed by `stop_id`, for symmetry and per-resource caching.
5. **"Union of a route's trips"** is represented as a single `MultiLineString` feature made of the route's **distinct shape geometries** — not a true geometric merge.
6. **Rollback:** the vector-tile path is preserved in full and selectable via a feature flag, so we can revert without a redeploy.

## Key facts about the current system

These shaped the design and are load-bearing for the plan:

- The nuxt app already opens the GTFS SQLite DB at runtime (`gtfsDbFilePath`, [server/sqlite-service.ts](../../../server/sqlite-service.ts)) and queries it via drizzle. The DB is present in production; existing endpoints ([server/api/gtfs/routes/[id].get.ts](../../../server/api/gtfs/routes/%5Bid%5D.get.ts), [server/api/broadcasts/geo.get.ts](../../../server/api/broadcasts/geo.get.ts)) already read shape geometry from it at request time.
- `getRouteTrips()` / `getTrips()` ([server/utils/routes-cache.ts](../../../server/utils/routes-cache.ts)) already assemble per-trip line geometry from the `shapes` table — but currently only to compute a bounding box; the geometry itself is discarded.
- The trips vector source drives **four** layers, not just the selected route: `warm-trips` (broadcast-adjacent routes), `hot-trips` (broadcast routes), `transit-trips` (the selected route), and `transit-trips-labels`. The set of route ids on screen at once = `{ selected route } ∪ { broadcast "hot" route ids } ∪ { broadcast "warm" route ids }`. The new path must render **N routes at once**, not one.
- The stops vector source drives `hot-stops` (broadcast stop ids) and `transit-stops` (the single selected stop id). Stops on screen = `{ selected stop id } ∪ { broadcast stop ids }`. The map never shows "all stops of a route," so keying stops by `stop_id` is sufficient.
- The map filter for the selected route is `["==", "route_id", route.routeId]` — it does **not** filter by direction, so both directions already display together today. The unioned per-`route_id` geometry (across directions) matches current behavior.
- gtfs-to-tiles, tippecanoe, and tileserver-gl require **no changes**. They remain the rollback path.

## Architecture

```
Client computes the id sets it needs to display:
  routeIds = selected ∪ broadcast-hot ∪ broadcast-warm
  stopIds  = selected-stop ∪ broadcast-stops

For each missing id (cached client-side):
  GET /api/gtfs/map/routes/{routeId}  -> Feature<MultiLineString>  (one route, unioned shapes)
  GET /api/gtfs/map/stops/{stopId}    -> Feature<Point>            (one stop)

Client assembles a FeatureCollection of exactly what's needed and sets it as
the MapGeoJSONSource `data`. Existing layers/paints/filters/labels are unchanged;
they now narrow within an already-tiny dataset.
```

## Server design

### New geometry helper

A shared helper (e.g. `server/utils/route-geometry.ts`) produces the unioned geometry for one route and the point for one stop, reusable by the new endpoints and by the existing bbox code.

**Route → `Feature<MultiLineString>`:**
- Select the **distinct** `shape_id`s used by the route's trips.
- For each distinct shape, read its points ordered by `shape_pt_sequence`, filtering out null lat/lon.
- Emit one `MultiLineString` whose members are those distinct shape lines.
- Properties mirror the current tile properties so downstream paint/label layers need no change: `route_id`, `route_short_name`, `route_long_name`, `route_color`, `route_text_color`, `agency_id`. Feature `id` = `route_id`.

**Correctness fix (required):** the existing `getTrips()` inner-joins `shapes` to a one-row-per-trip subquery, so each shape's points are duplicated once per trip that shares the shape, and the `ORDER BY shape_pt_sequence` sits outside the `GROUP BY`/`GROUP_CONCAT`, so intra-shape point order is not guaranteed ([server/utils/routes-cache.ts](../../../server/utils/routes-cache.ts) lines ~34–53). This is harmless for a bounding box but would yield duplicated and/or scrambled coordinates in rendered geometry. The new helper must:
- deduplicate shapes (select distinct `shape_id` for the route, independent of how many trips share it), and
- order points deterministically by `shape_pt_sequence` (order within the aggregate / via an ordered subquery, not an outer `ORDER BY`).

The existing bbox code should be refactored to call the corrected helper so the two paths cannot drift.

**Stop → `Feature<Point>`:**
- Look up the stop by `stop_id`; emit a `Point` at `[stop_lon, stop_lat]` with properties `stop_id`, `stop_name`. Feature `id` = `stop_id`.

### New endpoints

- `GET /api/gtfs/map/routes/{routeId}` → `Feature<MultiLineString>` for one route.
- `GET /api/gtfs/map/stops/{stopId}` → `Feature<Point>` for one stop.

Both:
- Reuse the existing authorization pattern (`authorize(event, getGtfs)`) and zod-validated router params, consistent with the current `/api/gtfs/*` handlers.
- Return `404` for unknown ids and validation errors for malformed ids; `500` on unexpected failure (matching existing handlers).

### Caching

Geometry is static for a given GTFS feed version, so cache aggressively:
- **In-process memoization** keyed by `route_id` / `stop_id`. A deploy restarts the process (and re-runs `gtfs:init` when the feed changes), which invalidates the cache naturally.
- **HTTP caching**: long-lived `Cache-Control` plus `ETag` so the browser and any CDN cache each per-resource URL independently.
- The client also caches each fetched id (see below) so a route/stop already on screen is never refetched.

## Client design

### Source swap, layers unchanged

In [components/routes-map.client.vue](../../../components/routes-map.client.vue), every layer already filters by `route_id` / `stop_id`. Keep all layers, paints, filters, and labels exactly as they are; change only the **source**:

- When the flag selects GeoJSON: render `MglGeoJsonSource` for trips and for stops, whose `data` is a `FeatureCollection` containing only the currently-needed routes/stops.
- When the flag selects tiles: render the existing `MglVectorSource`s unchanged.

Both source variants live in the component behind a conditional; the layer definitions are shared.

### Feature-fetching composable

A composable (e.g. `composable/useMapFeatures.ts`) owns:
- watching the needed id sets (`{ selected route } ∪ broadcast hot/warm` for routes; `{ selected stop } ∪ broadcast stops` for stops),
- fetching missing ids per-resource, in parallel, with per-id client caching (a reactive `Map`) and stale-request abort (matching the existing `AbortController` pattern in the component),
- exposing reactive `routesFeatureCollection` and `stopsFeatureCollection` for the GeoJSON sources.

### Flow preserved

The route/stop selection continues to flow from the report form → `props.route` / `props.stopId`, and broadcast ids continue to come from `/api/broadcasts/geo`. `fitBounds`/`easeTo` behavior (driven by `/api/gtfs/routes/{id}` bbox and `/api/gtfs/stops/{id}`) is unchanged.

## Feature flag & rollback

Add `sourceMode: 'tiles' | 'geojson'` (default `'tiles'`) to `mapIntegrationOptionSchema` in [db/schema.ts](../../../db/schema.ts). This options object is:
- stored in the DB (`integrations` table),
- delivered to the client via `/api/integrations/map` → `props.config` in the map component,

so `sourceMode` can be flipped **per environment without a redeploy**. Default `'tiles'` means existing behavior is unchanged until explicitly switched. Rollback from a problem in production is a single-field toggle.

## What stays untouched

gtfs-to-tiles, tippecanoe, tileserver-gl, the rsync deploy, and the vector-tile URLs/config in `MapOptions` all remain in place as the fallback path.

## Testing

- **Geometry helper (vitest):** distinct shapes only (no per-trip duplication); points ordered by sequence; `MultiLineString` structure; properties present and correctly named; null lat/lon excluded.
- **Endpoints (vitest):** id validation, unknown id → 404, well-formed feature output, auth enforced.
- **Parity check:** for a sample route, the bbox of the new GeoJSON matches the bbox the current tile-derived path produces (guards against geometry regressions).
- Manual verification: with `sourceMode: 'geojson'`, selecting a route and triggering broadcasts renders the same routes/stops/labels as the tile path, with materially smaller network transfer.

## Out of scope

- Precomputed static GeoJSON files and any gtfs-to-tiles changes (superseded by the on-demand decision; could be revisited later if runtime generation proves insufficient).
- Batched multi-id endpoints (explicitly chosen against in favor of per-resource endpoints).
- True geometric merge/dedup of overlapping segments.
- Changing how the GTFS DB is built (`gtfs:init`) or its schema.
