import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable, mastodonIntegrationOptionSchema, mapIntegrationOptionSchema, bskyIntegrationOptionSchema } from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";
import { z } from 'zod';

const putParamsSchema = z.object({
  id: z.number({coerce: true}).positive()
});

const postMastodonBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  name: z.literal("mastodon"),
  options: mastodonIntegrationOptionSchema,
});

const postBskyBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  name: z.literal("bsky"),
  options: bskyIntegrationOptionSchema,
});

const postMapBodySchema = z.object({
  enable: z.boolean({coerce: true}),
  name: z.literal("map"),
  options: mapIntegrationOptionSchema,
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateIntegrations);

  const { id } = await getValidatedRouterParams(event, putParamsSchema.parse);
  const { name } = await readBody(event);

  let integrationData;

  switch(name) {
    case 'mastodon':
      integrationData = await readValidatedBody(event, postMastodonBodySchema.parse);
      break;
    case 'map':
      integrationData = await readValidatedBody(event, postMapBodySchema.parse);
      break;
    case 'bsky':
      integrationData = await readValidatedBody(event, postBskyBodySchema.parse);
      break;
    default:
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Content',
      });
  }

  const formattedValues = {
    id: id,
    ...integrationData,
  };

  try {
    await db.insert(integrationsTable)
      .values(formattedValues)
      .onConflictDoUpdate({target: integrationsTable.id, set: formattedValues});
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});