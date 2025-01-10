import { invites } from '../../db/schema';
import { DB as db } from '../sqlite-service';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = uuidv4();

  await db.insert(invites).values({
    id
  });

  return {
    id
  }
})
