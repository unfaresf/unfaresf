import { allows } from "nuxt-authorization/utils";
import { reportInsertSchema } from "../../../db/schema";
import { createReports, broadcastReportsDirectly } from "../../../shared/utils/abilities";
import CreateReport from "../../utils/create-report";

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorizeRequest(event, createReports);

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

  // Admins/editors can approve reports anyway, so theirs skip review and are
  // broadcast immediately (without pushing a notification to reviewers).
  const user = await event.context.$authorization.resolveServerUser();
  const broadcast = !!user && await allows(broadcastReportsDirectly, user);

  try {
    return await CreateReport({event, reports: [report], options: { broadcast }});
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});
