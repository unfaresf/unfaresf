import { describe, it, expect, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import type { Feature } from 'geojson';
import { useMapFeatures } from '../../app/composable/useMapFeatures';

const flush = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

function routeFeature(id: string): Feature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] },
    properties: { route_id: id },
  };
}

describe('useMapFeatures', () => {
  it('fetches and collects only the requested route ids', async () => {
    const fetcher = vi.fn(async (url: string) => routeFeature(url.split('/').pop()!));
    const routeIds = ref<string[]>(['R1', 'R2']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1', 'R2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('caches ids and only fetches new ones on change', async () => {
    const fetcher = vi.fn(async (url: string) => routeFeature(url.split('/').pop()!));
    const routeIds = ref<string[]>(['R1']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    routeIds.value = ['R1', 'R2'];
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1', 'R2']);
    expect(fetcher).toHaveBeenCalledTimes(2); // R1 not refetched
  });

  it('skips ids whose fetch fails (e.g. 404)', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('R2')) throw new Error('404');
      return routeFeature(url.split('/').pop()!);
    });
    const routeIds = ref<string[]>(['R1', 'R2']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R1']);
  });

  it('ignores a stale sync that resolves after a newer one', async () => {
    const resolvers: Record<string, () => void> = {};
    const fetcher = vi.fn(
      (url: string) =>
        new Promise<Feature>((resolve) => {
          const id = url.split('/').pop()!;
          resolvers[id] = () => resolve(routeFeature(id));
        }),
    );
    const routeIds = ref<string[]>(['R1']);
    const stopIds = ref<string[]>([]);

    const { routesData } = useMapFeatures({ routeIds, stopIds, fetcher });
    await nextTick(); // syncRoutes(['R1']) started, R1 still pending

    routeIds.value = ['R2'];
    await nextTick(); // syncRoutes(['R2']) started, R2 still pending

    // Resolve the NEWER request first, then the older/stale one.
    resolvers['R2']!();
    await flush();
    resolvers['R1']!();
    await flush();

    expect(routesData.value.features.map((f) => f.id)).toEqual(['R2']);
  });
});
