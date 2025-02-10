import { reportInsertSchema } from "../../db/schema";
import { createReports } from "../../shared/utils/abilities";
import CreateReport from "~/shared/utils/create-report";

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, createReports);

  const defaultRepost = {
    source: 'internal',
  };
  const body = await readValidatedBody(event, reportInsertSchema.pick({
    route: true,
    stop: true,
    passenger: true,
  }).parse);

  const report = {
    ...defaultRepost,
    ...body
  };
  try {
    return CreateReport({event, reports: [report]});
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});