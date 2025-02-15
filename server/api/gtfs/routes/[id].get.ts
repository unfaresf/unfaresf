import { z } from "zod";
import { getGtfs } from "../../../../shared/utils/abilities";
import { getRouteTrips } from "../../../utils/routes-cache";

const gtfsGetRouteParamsSchema = z.object({
  id: z.string().trim().max(64)
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  const { id } = await getValidatedRouterParams(event, gtfsGetRouteParamsSchema.parse);

  try {
    // calculating the bbox is time consuming but doesnt change. cacheing...
    return getRouteTrips(id);
  } catch(err:any) {
    throw createError({
      statusCode: 500,
    });
  }
});