import { eq } from 'drizzle-orm';
import { DB as db } from "../../sqlite-service";
import { users as usersTable, Roles } from "../../../db/schema";
import { updateUsers } from "../../../shared/utils/abilities";
import { z } from "zod";

const userUpdateSchema = z.object({
  roles: z.string().array(),
});

function validateRoles(newRoles:string[]):boolean {
  return newRoles.every(role => Object.values<string>(Roles).includes(role));
}

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'));
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, updateUsers, userId);

  const { roles } = await readValidatedBody(event, userUpdateSchema.parse);

  if (isNaN(userId)) {
    throw createError({
      statusCode: 404
    });
  }
  if (!validateRoles(roles)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid role',
    });
  }

  try {
    await db.update(usersTable)
    .set({
      roles: JSON.stringify([...(new Set(roles))])
    })
    .where(eq(usersTable.id, userId));
  } catch (e: any) {
    throw createError({
      statusCode: 400,
      statusMessage: e.message,
    });
  }
});