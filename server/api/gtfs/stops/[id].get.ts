import { z } from "zod";
import { getGtfs } from "../../../../shared/utils/abilities";
import { gtfsDB } from "../../../sqlite-service";
import { stops } from "../../../../db/gtfs-migrations/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { bbox, point } from '@turf/turf';

export type SelectStop = InferSelectModel<typeof stops>;

const gtfsGetStopParamsSchema = z.object({
  id: z.string().trim().max(64)
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { id } = await getValidatedRouterParams(event, gtfsGetStopParamsSchema.parse);

  try {
    const stopResult = await gtfsDB
      .select()
      .from(stops)
      .where(
        eq(stops.stopId, id)
      )
      .limit(1);

    return stopResult;
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});