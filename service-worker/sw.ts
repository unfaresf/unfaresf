declare let self: ServiceWorkerGlobalScope
/* In the Service Worker. */
self.addEventListener('push', function(event) {
  const pushBody = event.data?.json();
  const promises = [];

  switch (pushBody.tag) {
    case 'new-report':
      promises.push(
        self.registration.showNotification(pushBody.title, {
          body: pushBody.body,
          // @ts-ignore it exists, type is wrong https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#image
          image: '/android-chrome-192x192.png',
          tag: pushBody.tag,
          data: {
            reportUrl: pushBody.reportUrl
          }
        })
      );
      break;
    default:
      break;
  }

  event.waitUntil(Promise.all(promises));
});

self.addEventListener('notificationclick', async (event) => {
  const clickedNotification = event.notification;
  clickedNotification.close();

  const openingWindow = clients.openWindow(`${event.notification.data.reportUrl}`)
  .then(windowClient => {
    if (windowClient) {
      windowClient.focus();
    }
  });

  event.waitUntil(openingWindow);
});