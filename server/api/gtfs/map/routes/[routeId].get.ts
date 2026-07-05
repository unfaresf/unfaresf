import { z } from 'zod';
import { unescape } from 'node:querystring';
import { getGtfs } from '../../../../../shared/utils/abilities';
import { getRouteFeature } from '../../../../utils/gtfs-map-features';

const paramsSchema = z.object({
  routeId: z.string().trim().min(1).max(64).transform(unescape),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { routeId } = await getValidatedRouterParams(event, paramsSchema.parse);

  let feature;
  try {
    feature = await getRouteFeature(routeId);
  } catch (err: any) {
    throw createError({ statusCode: 500 });
  }

  if (!feature) {
    throw createError({ statusCode: 404, statusMessage: 'Route not found' });
  }

  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return feature;
});
