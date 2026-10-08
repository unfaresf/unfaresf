import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// public/service-worker.js is a plain script with no exports. Run it against
// stubbed worker globals and capture the listeners it registers.
// Relative to the repo root, where vitest runs (import.meta.url isn't a file:
// URL under the nuxt test environment).
const source = readFileSync('public/service-worker.js', 'utf8');

function loadServiceWorker({ maxActions = 2 } = {}) {
  const listeners: Record<string, (event: any) => void> = {};
  const self = {
    skipWaiting: vi.fn(),
    addEventListener: (type: string, listener: (event: any) => void) => {
      listeners[type] = listener;
    },
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
  };
  const clients = { openWindow: vi.fn(() => Promise.resolve(null)) };
  const fetch = vi.fn(() => Promise.resolve({ ok: true, status: 201 }));
  new Function('self', 'clients', 'Notification', 'fetch', 'WorkerNavigator', source)(
    self,
    clients,
    { maxActions },
    fetch,
    { setAppBadge: vi.fn(() => Promise.resolve()) },
  );
  return { listeners, self, clients, fetch };
}

const pushBody = {
  title: '🚌 🐷 Report',
  body: '4:00 AM: Fare inspectors at Powell Eastbound',
  tag: 'new-report',
  reportUrl: '/reports/7',
  unhandledReportsCount: 1,
  canPost: true,
};

async function push(sw: ReturnType<typeof loadServiceWorker>, body: object) {
  const waitUntil = vi.fn();
  sw.listeners.push!({ data: { json: () => body }, waitUntil });
  await waitUntil.mock.calls[0]![0];
  const [, options] = sw.self.registration.showNotification.mock.calls[0] as unknown as [string, any];
  return options;
}

async function click(sw: ReturnType<typeof loadServiceWorker>, action: string, data: object) {
  const waitUntil = vi.fn();
  sw.listeners.notificationclick!({ action, notification: { data, close: vi.fn() }, waitUntil });
  await waitUntil.mock.calls[0]![0];
}

describe('service worker new-report notification', () => {
  it('offers Post and Dismiss for a report that can be posted as-is', async () => {
    const options = await push(loadServiceWorker(), pushBody);
    expect(options.actions.map((a: any) => a.action)).toEqual(['post', 'dismiss']);
  });

  it('offers only Dismiss for a report that needs review first', async () => {
    const options = await push(loadServiceWorker(), { ...pushBody, canPost: false });
    expect(options.actions.map((a: any) => a.action)).toEqual(['dismiss']);
  });

  it('keeps only as many actions as the platform supports', async () => {
    const posted = await push(loadServiceWorker({ maxActions: 1 }), pushBody);
    expect(posted.actions.map((a: any) => a.action)).toEqual(['post']);
    const none = await push(loadServiceWorker({ maxActions: 0 }), pushBody);
    expect(none.actions).toEqual([]);
  });

  it('posts the notification body as the broadcast for a report that can be posted', async () => {
    const sw = loadServiceWorker();
    const options = await push(sw, pushBody);
    await click(sw, 'post', options.data);

    expect(sw.fetch).toHaveBeenCalledWith('/api/broadcasts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: pushBody.body, reportId: '7' }),
    }));
  });

  it('opens the report instead of posting when the notification data says it needs review', async () => {
    const sw = loadServiceWorker();
    await click(sw, 'post', { reportUrl: '/reports/7', message: 'scraped toot text', canPost: false });

    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/reports/7');
  });
});
