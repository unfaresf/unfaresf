import { DB as db } from "../../sqlite-service";
import { integrations as integrationsTable } from "../../../db/schema";
import { updateIntegrations } from "../../../shared/utils/abilities";
import { z } from 'zod';

const putParamsSchema = z.object({
  id: z.number({coerce: true}).positive()
})
const putBodySchema = z.object({
  enable: z.boolean(),
  token: z.string().optional(),
  url: z.string().url().optional(),
  accountName: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateIntegrations);
  const { id } = await getValidatedRouterParams(event, putParamsSchema.parse);
  const integrationData = await readValidatedBody(event, putBodySchema.parse);
  const formattedValues = {
    id: id,
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
      .values(formattedValues)
      .onConflictDoUpdate({target: integrationsTable.id, set: formattedValues});
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});