import { DB as db } from "../../server/sqlite-service";
import { eq } from 'drizzle-orm';
import { reports as reportsTable, broadcasts as broadcastsTable, type InsertBroadcast, type SelectBroadcast } from "../../db/schema";
import type { H3Event, EventHandlerRequest } from 'h3';

type CreateBroadcastArgs = {
  broadcasts: { [K in keyof InsertBroadcast]-?: NonNullable<InsertBroadcast[K]> },
  event?: H3Event<EventHandlerRequest>,
  options?: ControllerOptions,
};

export default async function CreateBroadcast(args: CreateBroadcastArgs): Promise<{ id: SelectBroadcast['id'] }[]> {
  const newBroadcast = await db.insert(broadcastsTable).values(args.broadcasts).returning({ id: broadcastsTable.id });
  await db.update(reportsTable).set({ reviewedAt: new Date() }).where(eq(reportsTable.id, args.broadcasts.reportId));
  return newBroadcast;
}