import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable, mastodonIntegrationOptionSchema, mapIntegrationOptionSchema } from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";
import { z } from 'zod';

const postMastodonBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  name: z.literal("mastodon"),
  options: mastodonIntegrationOptionSchema,
});

const postMapBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  name: z.literal("map"),
  options: mapIntegrationOptionSchema,
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateIntegrations);

  const { name } = await readBody(event);

  let integrationData;

  if (name === 'mastodon') {
    integrationData = await readValidatedBody(event, postMastodonBodySchema.parse);
  }
  else if (name === 'map') {
    integrationData = await readValidatedBody(event, postMapBodySchema.parse);
  }
  else {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Content',
    });
  }

  try {
    await db.insert(integrationsTable)
      .values(integrationData)
      .onConflictDoNothing();
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});