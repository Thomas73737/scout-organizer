self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Notification', message: '' };

  const options = {
    body: data.message,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: data.data || {},
    vibrate: [200, 100, 200],
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
