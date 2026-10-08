import { describe, it, expect } from 'vitest';
import { formatReportAsNotification } from './notify';
import getPlainTextSummary from '#shared/utils/get-plain-text-summary';
import type { SelectReport } from '../../db/schema';

const report = {
  id: 42,
  createdAt: new Date('2026-07-10T12:00:00Z'),
  source: 'internal',
  uri: 'https://unfaresf.org/reports/42',
  route: null,
  stop: { stopId: '1', stopName: 'Foo Station', direction: 'Northbound' },
  direction: null,
  passenger: false,
  message: 'Fare inspectors spotted at Foo Station',
  reviewedAt: null,
} as unknown as SelectReport;

describe('formatReportAsNotification', () => {
  it('uses the plain-text summary as the body (reused verbatim as the broadcast message)', () => {
    const detail = formatReportAsNotification(report, 3);
    expect(detail.body).toBe(getPlainTextSummary(report));
  });

  it('formats reportUrl as /reports/:reportId (the service worker parses the id back out of it)', () => {
    const detail = formatReportAsNotification(report, 3);
    expect(detail.reportUrl).toBe('/reports/42');
  });

  it('keeps the new-report tag and outstanding count', () => {
    const detail = formatReportAsNotification(report, 3);
    expect(detail.tag).toBe('new-report');
    expect(detail.unhandledReportsCount).toBe(3);
  });

  it('lets an internal report be posted straight from the notification', () => {
    const detail = formatReportAsNotification(report, 3);
    expect(detail.canPost).toBe(true);
  });

  it('does not let an external-source report be posted from the notification (its body is the scraped text)', () => {
    const detail = formatReportAsNotification({ ...report, source: 'mastodon' }, 3);
    expect(detail.canPost).toBe(false);
  });
});
