import { DB as db } from "../../sqlite-service";
import { eq } from 'drizzle-orm';
import { broadcasts as broadcastsTable, reports as reportsTable } from "../../../db/schema";
import { z } from "zod";
import { createBroadcasts } from "../../../shared/utils/abilities";

const broadcastPostBodySchema = z.object({
  message: z.string().min(8).max(400).trim(),
  reportId: z.number({coerce: true}).int().positive(),
});

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, createBroadcasts);

  const { message, reportId } = await readValidatedBody(event, broadcastPostBodySchema.parse);

  try {
    await db.transaction(async (tx) => {
      return Promise.all([
        tx.insert(broadcastsTable).values({ message, reportId, platforms: '' }).returning(),
        tx.update(reportsTable).set({reviewedAt: new Date()}).where(eq(reportsTable.id, reportId)),
      ]);
    });

    setResponseStatus(event, 201);
  } catch (err:any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message,
    });
  }
});