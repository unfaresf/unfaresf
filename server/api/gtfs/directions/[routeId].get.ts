import { getGtfs } from "../../../../shared/utils/abilities";
import { z } from "zod";
import { gtfsDB } from "../../../sqlite-service";
import { routes, agency, directions } from "../../../../db/gtfs-migrations/schema";
import { like, eq, or } from "drizzle-orm";

const gtfsGetDirectionsParamSchema = z.object({
  routeId: z.string().trim().nonempty().max(32)
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);
  const { routeId } = await getValidatedRouterParams(event, gtfsGetDirectionsParamSchema.parse);
  try {
    const results = await gtfsDB
      .select()
      .from(directions)
      .where(
        eq(directions.routeId, routeId)
      )
      .limit(10)
    return results;
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});