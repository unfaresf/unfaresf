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
  it('creates the report already reviewed', async () => {
    const [created] = await CreateReport({ reports: [report], options: { broadcast: true } });

    expect(created!.reviewedAt).toBeInstanceOf(Date);
    const [stored] = await DB.select().from(reportsTable);
    expect(stored!.reviewedAt).toBeInstanceOf(Date);
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
});
