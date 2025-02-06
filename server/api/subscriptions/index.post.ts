import { DB as db } from "../../sqlite-service"
import { subscriptions as subscriptionsTable, subscriptionsInsertSchema } from "../../../db/schema";
import { createSubscription } from "../../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, createSubscription);

  const body = await readValidatedBody(event, subscriptionsInsertSchema.omit({userId: true}).parse);
  const { user } = await getUserSession(event);
  if (!user || user.id === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No user',
    });
  }
  const newSub = {
    ...body,
    userId: user.id
  };

  try {
    await db.insert(subscriptionsTable).values(newSub);
    setResponseStatus(event, 201, "Created");
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: e.message,
    });
  }
});