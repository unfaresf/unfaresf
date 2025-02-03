import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable } from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";
import { z } from 'zod';

const postBodySchema = z.object({
  enable: z.boolean(),
  token: z.string().optional(),
  url: z.string().url().optional(),
  accountName: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateIntegrations);

  const integrationData = await readValidatedBody(event, postBodySchema.parse);
  const formattedvlues = {
    name: 'mastodon',
    enable: integrationData.enable,
    options: {
      token: integrationData.token,
      url: integrationData.url,
      accountName: integrationData.accountName,
    }
  }
  try {
    await db.insert(integrationsTable)
      .values(formattedvlues)
      .onConflictDoNothing();
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});