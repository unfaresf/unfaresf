import { invites } from '../../db/schema';
import { DB as db } from '../sqlite-service';
import { v4 as uuidv4 } from 'uuid';
import { createInvites } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, createInvites);

  const id = uuidv4();

  await db.insert(invites).values({
    id
  });

  return {
    id
  }
})
