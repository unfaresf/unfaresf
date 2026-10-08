import { it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import CreateBroadcast, { ReportAlreadyReviewedError } from './create-broadcast';
import { DB } from '../sqlite-service';
import { broadcasts as broadcastsTable, reports as reportsTable } from "../../db/schema";

const message = '4:00 AM: Fare inspectors at Powell Eastbound';
const stop = { stopId: 's1', stopName: 'Powell', direction: 'Eastbound' };

async function insertMastodonReport(fields: Partial<typeof reportsTable.$inferInsert> = {}) {
  const [report] = await DB.insert(reportsTable)
    .values({ source: 'mastodon', message: 'scraped toot text', ...fields })
    .returning();
  return report!;
}

async function getReport(id: number) {
  const [report] = await DB.select().from(reportsTable).where(eq(reportsTable.id, id));
  return report!;
}

afterEach(async () => {
  await DB.delete(broadcastsTable);
  await DB.delete(reportsTable);
});

it('saves the reviewed details, marks the report reviewed and creates the broadcast', async () => {
  const report = await insertMastodonReport();

  CreateBroadcast({ reportId: report.id, message, details: { stop, passenger: false } });

  const stored = await getReport(report.id);
  expect(stored.stop).toEqual(stop);
  expect(stored.passenger).toBe(false);
  expect(stored.reviewedAt).not.toBeNull();
  await expect(DB.select({ message: broadcastsTable.message }).from(broadcastsTable))
    .resolves.toEqual([{ message }]);
});

it('does not broadcast a report someone else already reviewed', async () => {
  const reviewedAt = new Date('2026-10-07T20:00:00Z');
  const report = await insertMastodonReport({ reviewedAt });

  expect(() => CreateBroadcast({ reportId: report.id, message, details: { stop, passenger: false } }))
    .toThrow(ReportAlreadyReviewedError);

  const stored = await getReport(report.id);
  expect(stored.stop).toBeNull();
  expect(stored.reviewedAt).toEqual(reviewedAt);
  await expect(DB.select().from(broadcastsTable)).resolves.toEqual([]);
});

it('leaves the report unreviewed and unchanged when the broadcast insert fails, so it can be retried', async () => {
  const report = await insertMastodonReport();
  // A stray broadcast row makes the insert hit the unique report_id constraint.
  await DB.insert(broadcastsTable).values({ reportId: report.id, message: 'stray' });

  expect(() => CreateBroadcast({ reportId: report.id, message, details: { stop, passenger: false } }))
    .toThrow(/UNIQUE constraint failed: broadcasts.report_id/);

  const stored = await getReport(report.id);
  expect(stored.stop).toBeNull();
  expect(stored.passenger).toBeNull();
  expect(stored.reviewedAt).toBeNull();
});
