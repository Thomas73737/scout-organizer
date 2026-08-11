self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Notification', message: '' };

  const tag = data.data?.type
    ? `${data.data.type}-${data.data.relatedId || data.data.announcementId || data.data.messageId || 'new'}`
    : undefined;

  const options = {
    body: data.message,
    icon: '/favicon.png',
    badge: '/favicon.png',
    image: data.image || undefined,
    tag: tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
