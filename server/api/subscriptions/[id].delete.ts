import { DB as db } from "../../sqlite-service";
import { eq } from 'drizzle-orm';
import { subscriptions as subscriptionsTable } from "../../../db/schema";
import { deleteSubscription } from "../../../shared/utils/abilities";
import z from 'zod';

const deleteSubscriptionParamsSchema = z.object({
  id: z.number({coerce: true}).int().positive()
})

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, deleteSubscriptionParamsSchema.parse);

  // Look up the subscription's owner here (the ability no longer touches the DB).
  const sub = await db.query.subscriptions.findFirst({
    columns: { userId: true },
    where: eq(subscriptionsTable.id, id),
  });

  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, deleteSubscription, sub?.userId ?? null);

  try {
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, id));
    setResponseStatus(event, 200, "Deleted");
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});