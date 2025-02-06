import { DB as db } from "../../sqlite-service";
import { eq } from 'drizzle-orm';
import { users as usersTable, subscriptions as subscriptionsTable } from "../../../db/schema";
import { deleteSubscription } from "../../../shared/utils/abilities";
import z from 'zod';

const deleteSubscriptionQuerySchema = z.object({
  endpoint: z.string().url()
});

export default defineEventHandler(async (event) => {
  const { endpoint } = await getValidatedQuery(event, deleteSubscriptionQuerySchema.parse);
  const {user} = await getUserSession(event);
  if (!user || user.id === undefined) {
    throw createError({
      statusCode: 401,
      message: "1"
    });
  }
  const usersAndSubscriptions = await db.select().from(usersTable)
    .where(eq(usersTable.id, user.id))
    .innerJoin(subscriptionsTable, eq(subscriptionsTable.userId, user.id));

  const userSub = usersAndSubscriptions.find(userAndSub=> {
    return userAndSub.subscriptions.details.endpoint === endpoint
  });
  if (!userSub) {
    throw createError({
      statusCode: 401,
      message: "2"
    });
  }

  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, deleteSubscription, userSub.subscriptions.id);
  try {
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, userSub.subscriptions.id));
    setResponseStatus(event, 200, "Deleted");
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});