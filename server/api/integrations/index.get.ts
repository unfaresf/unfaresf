import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable } from "../../../db/schema";
import { getIntegrations } from "../../../shared/utils/abilities";
import { z } from "zod";

const integrationsRouteQuerySchema = z.object({
  name: z.string().trim().toLowerCase().optional(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getIntegrations);

  const { name } = await getValidatedQuery(event, integrationsRouteQuerySchema.parse);
  try {
    return db.select()
      .from(integrationsTable)
      .where((name ? eq(integrationsTable.name, name) : undefined))
      .limit(10);
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});