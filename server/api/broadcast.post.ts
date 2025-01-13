import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable } from "../../db/schema";
import { z } from "zod";
import { createBroadcasts } from "../../shared/utils/abilities";

const broadcastPostBodySchema = z.object({
  message: z.string().min(8).max(400).trim()
});

export default defineEventHandler(async (event) => {
  await authorize(event, createBroadcasts);

  const { message } = await readValidatedBody(event, broadcastPostBodySchema.parse);

  try {
    await db.insert(broadcastsTable).values({message}).returning();
    setResponseStatus(event, 201);
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});