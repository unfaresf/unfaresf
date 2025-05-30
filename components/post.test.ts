import { vi, it, expect } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { Post, ReportSummary } from '#components';
import type { SelectReport }  from '../db/schema';
import { faker } from '@faker-js/faker';

const mockReport: SelectReport = {
  id: 123,
  createdAt: new Date("May 15, 2025 04:00:00"),
  source: 'internal',
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

it('post should show the report summary', async () => {
  const component = await mountSuspended(Post, {
    props: {
      report: mockReport
    }
  });
  expect(component.findComponent(ReportSummary).isVisible()).toBe(true);
});

it('should show internal report broadcast form if report is from internal source', async () => {
  const component = await mountSuspended(Post, {
    props: {
      report: mockReport
    }
  });
  expect(component.find('#internal-source-broadcast-form').exists()).toBe(true);
});

it('should mark the report as not approved with the API', async () => {
  const mockFetch = vi.spyOn(global, '$fetch');
  registerEndpoint(`/api/reports`, {
    method: 'PUT',
    handler: () => ({
      id: 123,
      reviewedAt: new Date()
    })
  });

  const component = await mountSuspended(Post, {
    props: {
      report: mockReport
    }
  });
  component.find('#post-dismiss-button').trigger('click');

  expect(mockFetch).toHaveBeenCalledWith(`/api/reports/${mockReport.id}`, {
    method: 'PUT',
    body: {
      approved: false
    },
  });
});

it('should mark the report as approved with the API', async () => {
  const mockFetch = vi.spyOn(global, '$fetch');
  registerEndpoint(`/api/broadcasts`, {
    method: 'POST',
    handler: () => ({
      id: 123,
      reviewedAt: new Date()
    })
  });

  const component = await mountSuspended(Post, {
    props: {
      report: mockReport
    }
  });
  component.find('#post-post-button').trigger('click');

  expect(mockFetch).toHaveBeenCalledWith(`/api/broadcasts`, {
    method: 'POST',
    body: {
      message: '4:00 AM: Fare inspectors at Mission for the south 22',
      reportId: mockReport.id,
    }
  });
});