import { and, gte, or, notLike, isNull } from 'drizzle-orm';
import { DB as db } from "../sqlite-service";
import { broadcasts as broadcastsTable } from "../../db/schema";
import { subMinutes } from 'date-fns';

export default async function fetchUnpublishedBroadcasts(platform:string, ttl=30) {
  return db
    .select()
    .from(broadcastsTable)
    .where(
      and(
        gte(broadcastsTable.createdAt, subMinutes(new Date(), ttl)),
        notLike(broadcastsTable.platforms, `%${platform}%`)
      )
    );
}