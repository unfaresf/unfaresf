/* In the Service Worker. */
type PushNotificationBody = {
  notification: {
    reportUrl: number;
    title: string;
    body: string;
    tag: string;
  }
};

self.addEventListener('push', function(event) {
  const pushBody = event.data.json();
  // Display notification or handle data
  // Example: show a notification
  const title = pushBody.notification.title;
  const body = pushBody.notification.body;
  const image = '/android-chrome-192x192.png';
  const tag = pushBody.notification.tag;

  const promises = [];

  switch (pushBody.notification.tag) {
    case 'new-report':
      promises.push(
        self.registration.showNotification(title, {
          body: body,
          image: image,
          tag: tag,
          data: {
            reportUrl: pushBody.notification.reportUrl
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