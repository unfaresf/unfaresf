import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable, integrationOptionsSchema, IntegrationOptions } from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";
import { z } from 'zod';

const integrationBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  options: integrationOptionsSchema,
});


export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateIntegrations);

  const integrationBody = await readValidatedBody(event, integrationBodySchema.parse);

  try {
    await db.insert(integrationsTable)
      .values({...integrationBody, name: integrationBody.options.type})
      .onConflictDoNothing();
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});