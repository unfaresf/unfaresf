import { ref, watch, type Ref } from 'vue';
import type { Feature, FeatureCollection } from 'geojson';

type Fetcher = (url: string) => Promise<Feature>;

function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function useMapFeatures(params: {
  routeIds: Ref<string[]>;
  stopIds: Ref<string[]>;
  fetcher?: Fetcher;
}): { routesData: Ref<FeatureCollection>; stopsData: Ref<FeatureCollection> } {
  // `$fetch` is a Nuxt auto-import available at runtime; tests inject `fetcher`.
  const fetcher: Fetcher = params.fetcher ?? ((url) => $fetch<Feature>(url));

  const routeCache = new Map<string, Feature | null>();
  const stopCache = new Map<string, Feature | null>();
  const routesData = ref<FeatureCollection>(emptyCollection());
  const stopsData = ref<FeatureCollection>(emptyCollection());

  async function ensure(ids: string[], cache: Map<string, Feature | null>, urlFor: (id: string) => string) {
    const missing = ids.filter((id) => !cache.has(id));
    await Promise.all(
      missing.map(async (id) => {
        try {
          cache.set(id, await fetcher(urlFor(id)));
        } catch {
          cache.set(id, null); // unknown/404 — remember so we don't refetch
        }
      }),
    );
  }

  function collect(ids: string[], cache: Map<string, Feature | null>): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: ids.map((id) => cache.get(id)).filter((f): f is Feature => !!f),
    };
  }

  async function syncRoutes(ids: string[]) {
    await ensure(ids, routeCache, (id) => `/api/gtfs/map/routes/${encodeURIComponent(id)}`);
    routesData.value = collect(ids, routeCache);
  }

  async function syncStops(ids: string[]) {
    await ensure(ids, stopCache, (id) => `/api/gtfs/map/stops/${encodeURIComponent(id)}`);
    stopsData.value = collect(ids, stopCache);
  }

  watch(params.routeIds, (ids) => { void syncRoutes(ids); }, { immediate: true, deep: true });
  watch(params.stopIds, (ids) => { void syncStops(ids); }, { immediate: true, deep: true });

  return { routesData, stopsData };
}
