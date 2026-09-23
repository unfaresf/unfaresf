import { it, expect, afterEach, describe, vi } from 'vitest';
import CreateReport from './create-report';
import Notify from './notify';
import { DB } from '../sqlite-service';
import { broadcasts as broadcastsTable, reports as reportsTable, type InsertReport } from "../../db/schema";
import getPlainTextSummary from '#shared/utils/get-plain-text-summary';

// Notify sends real web-push requests; stub it so we can assert whether
// subscribers would have been pushed without touching the network.
vi.mock('./notify', () => ({
  default: vi.fn(async () => []),
}));

const report: InsertReport = {
  source: 'internal',
  passenger: false,
  stop: { stopId: '1', stopName: 'Foo Station', direction: 'Northbound' },
};

afterEach(async () => {
  vi.mocked(Notify).mockClear();
  await DB.delete(broadcastsTable);
  await DB.delete(reportsTable);
});

describe('default (review required)', () => {
  it('creates an unreviewed report with no broadcast', async () => {
    const [created] = await CreateReport({ reports: [report] });

    expect(created!.reviewedAt).toBeNull();
    await expect(DB.select().from(broadcastsTable)).resolves.toEqual([]);
  });

  it('notifies subscribers', async () => {
    await CreateReport({ reports: [report] });

    expect(Notify).toHaveBeenCalledOnce();
  });
});

describe('with the broadcast option', () => {
  it('creates the report reviewed as of now', async () => {
    // whole second: timestamp columns are stored at second precision
    const now = new Date('2026-09-22T20:15:00Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    try {
      const [created] = await CreateReport({ reports: [report], options: { broadcast: true } });

      expect(created!.reviewedAt).toEqual(now);
      const [stored] = await DB.select().from(reportsTable);
      expect(stored!.reviewedAt).toEqual(now);
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates a broadcast for the report using its plain-text summary', async () => {
    const [created] = await CreateReport({ reports: [report], options: { broadcast: true } });

    const broadcasts = await DB.select().from(broadcastsTable);
    expect(broadcasts).toEqual([
      expect.objectContaining({
        reportId: created!.id,
        message: getPlainTextSummary(created!),
        platforms: '',
      }),
    ]);
  });

  it('does not notify subscribers', async () => {
    await CreateReport({ reports: [report], options: { broadcast: true } });

    expect(Notify).not.toHaveBeenCalled();
  });

  it('does not keep the report if its broadcast fails to insert', async () => {
    DB.$client.exec(`CREATE TRIGGER fail_broadcast_insert BEFORE INSERT ON broadcasts
      BEGIN SELECT RAISE(ABORT, 'broadcast insert failed'); END`);
    try {
      await expect(CreateReport({ reports: [report], options: { broadcast: true } }))
        .rejects.toThrow('broadcast insert failed');

      await expect(DB.select().from(reportsTable)).resolves.toEqual([]);
      await expect(DB.select().from(broadcastsTable)).resolves.toEqual([]);
    } finally {
      DB.$client.exec('DROP TRIGGER fail_broadcast_insert');
    }
  });
});
