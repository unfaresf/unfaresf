self.skipWaiting();

// declare let self: ServiceWorkerGlobalScope
/* In the Service Worker. */
self.addEventListener('push', function(event) {
  const pushBody = event.data?.json();
  const promises = [];

  switch (pushBody.tag) {
    case 'new-report': {
      // Notification action buttons aren't supported everywhere (notably iOS
      // Safari). Notification.maxActions is undefined/0 where they're
      // unsupported; guard with typeof to avoid a ReferenceError in the SW
      // global scope, and only attach as many buttons as the platform allows.
      // When no buttons render, the notification still shows and tapping it
      // opens the app (see the default branch in notificationclick).
      const maxActions = (typeof Notification !== 'undefined' && Notification.maxActions) || 0;
      const actions = [];
      if (maxActions >= 1) actions.push({ action: 'post', title: 'Post' });
      if (maxActions >= 2) actions.push({ action: 'dismiss', title: 'Dismiss' });

      promises.push(
        self.registration.showNotification(pushBody.title, {
          body: pushBody.body,
          // @ts-ignore it exists, type is wrong https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#image
          image: '/android-chrome-192x192.png',
          tag: pushBody.tag,
          actions,
          data: {
            reportUrl: pushBody.reportUrl,
            // == getPlainTextSummary(report); reused verbatim as the broadcast
            // message by the 'post' action so no separate lookup is needed.
            message: pushBody.body,
          }
        })
      );
      try {
        promises.push(WorkerNavigator.setAppBadge(pushBody.unhandledReportsCount));
      } catch(err) {}
      break;
    }
    default:
      break;
  }

  event.waitUntil(Promise.all(promises));
});

// Open the report in the app. Used for plain taps and as the graceful fallback
// when an action's API call fails (e.g. expired session, already handled).
function openReport(reportUrl) {
  return clients.openWindow(reportUrl).then(windowClient => {
    if (windowClient) {
      windowClient.focus();
    }
  });
}

// reportUrl is formatted as '/reports/:reportId'; derive the id from it rather
// than carrying a separate payload field.
function reportIdFromUrl(reportUrl) {
  const match = /\/reports\/(\d+)/.exec(reportUrl || '');
  return match ? match[1] : undefined;
}

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const { reportUrl, message } = notification.data || {};
  const reportId = reportIdFromUrl(reportUrl);
  notification.close();

  let work;
  switch (event.action) {
    case 'post':
      // Post immediately; on success there's no follow-up notification. On any
      // failure (401 expired session, 409 already broadcast, network error)
      // fall back to opening the app so the reviewer can finish in-app.
      work = fetch('/api/broadcasts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, reportId }),
      })
        .then(res => (res.ok ? undefined : openReport(reportUrl)))
        .catch(() => openReport(reportUrl));
      break;
    case 'dismiss':
      // Mark the report reviewed without creating a broadcast. The endpoint
      // only updates rows where reviewedAt is still null, so a double-dismiss
      // is a harmless no-op.
      work = fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
        .then(res => (res.ok ? undefined : openReport(reportUrl)))
        .catch(() => openReport(reportUrl));
      break;
    default:
      // Plain tap, or a platform that doesn't render action buttons.
      work = openReport(reportUrl);
      break;
  }

  event.waitUntil(work);
});
