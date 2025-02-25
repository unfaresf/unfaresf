import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable } from "../../../db/schema";
import { getPublicIntegrations } from "../../../shared/utils/abilities";
// import { z } from "zod";

// const allowedNames = ["map"] as const;
// const integrationsParamsSchema = z.object({
//   name: z.enum(allowedNames),
// });

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getPublicIntegrations);

  // For some reason parameterizing the name doesnt work. so i hard coded this route
  // until we need more things like this.
  // const { name } = await getValidatedRouterParams(event, integrationsParamsSchema.parse);

  try {
    const [integration] = await db.select()
      .from(integrationsTable)
      .where(eq(integrationsTable.name, 'map'))
      .limit(1);
    if (integration) return integration;
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    });
  } catch (e: any) {
    if (e.statusCode === 404) throw e;
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});