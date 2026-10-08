import { reportInsertSchema } from "../../../db/schema";
import { z } from "zod";
import { createBroadcasts } from "../../../shared/utils/abilities";
import CreateBroadcast, { ReportAlreadyReviewedError } from "../../utils/create-broadcast";

const broadcastPostBodySchema = z.object({
  message: z.string().min(8).max(400).trim(),
  reportId: z.number({coerce: true}).int().positive(),
  // Reviewed details for an external-source report, saved with the broadcast.
  ...reportInsertSchema.pick({
    route: true,
    stop: true,
    passenger: true,
  }).partial().shape,
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorizeRequest(event, createBroadcasts);

  const { message, reportId, ...details } = await readValidatedBody(event, broadcastPostBodySchema.parse);

  try {
    CreateBroadcast({ reportId, message, details });

    setResponseStatus(event, 201);
  } catch (err:any) {
    if (err instanceof ReportAlreadyReviewedError || err.message === 'UNIQUE constraint failed: broadcasts.report_id') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Report already reviewed',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: err.message,
    });
  }
});
