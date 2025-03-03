import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service";
import { users as usersTable, credentials as credentialsTable, subscriptions as subscriptionsTable } from "../../../db/schema";
import { deleteUsers } from "../../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'));
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, deleteUsers, userId);

  if (isNaN(userId)) {
    throw createError({
      statusCode: 404
    });
  }

  try {
    await db.transaction(async (tx) => {
      await Promise.all([
        tx.delete(credentialsTable)
          .where(eq(credentialsTable.userId, userId))
          .limit(1),
        tx.delete(subscriptionsTable)
          .where(eq(subscriptionsTable.userId, userId))
          .limit(1)
      ]);
      await tx.delete(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
    });
  } catch (e: any) {
    console.error(e);
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});