import { it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ReportSummary } from '#components'
import type { SelectReport } from '../db/schema';

const mockReport: SelectReport = {
  id: 123,
  createdAt: new Date(),
  source: 'test',
  uri: null,
  reviewedAt: null,
  route: {
    routeId: '123',
    routeShortName: '22',
    routeLongName: '22',
    agencyId: '123',
    agencyName: 'Muni',
    direction: 'south',
  },
  stop: {
    stopId: '123',
    stopName: 'Mission',
    direction: 'south',
  },
  direction: {
    routeId: '123',
    directionId: null,
    direction: 'south'
  },
  passenger: null,
  message: null
};

it('can mount report-summary component', async () => {
  const component = mount(ReportSummary, {
    props: {
      report: mockReport
    }
  });
  expect(component.text()).toMatchInlineSnapshot(
    `"Fare inspectors at Mission for the south bound 22"`
  )
});
