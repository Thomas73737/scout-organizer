import { useEffect, useRef, useState, useCallback } from 'react';

const SW_PATH = '/service-worker.js';

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<string>('initializing');
  const initCalledRef = useRef(false);

  const fetchVapidKey = useCallback(async () => {
    try {
      const res = await fetch('/api/push/vapid-public-key');
      const data = await res.json();
      setVapidPublicKey(data.publicKey);
      return data.publicKey;
    } catch (err) {
      console.error('Failed to fetch VAPID public key:', err);
      setAppStatus('no_vapid_key');
      return null;
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getSubscriptionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/push/status', { credentials: 'include' });
      const data = await res.json();
      setIsSubscribed(data.subscribed);
      setDeviceCount(data.deviceCount);
    } catch (err) {
      console.error('Failed to get subscription status:', err);
    }
  }, []);

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    if (!userId) return;

    const init = async () => {
      try {
        setAppStatus('initializing');
        const key = await fetchVapidKey();
        if (!key) return;

        setAppStatus('registering_sw');
        const registration = await navigator.serviceWorker.register(SW_PATH);
        await navigator.serviceWorker.ready;

        setPermission(Notification.permission);
        await getSubscriptionStatus();
        setAppStatus('ready');
      } catch (error) {
        console.error('Push notification init failed:', error);
        setAppStatus('error');
      }
    };

    init();
  }, [userId, fetchVapidKey, getSubscriptionStatus]);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      alert('Your browser does not support notifications. Please try Chrome, Firefox, or Safari.');
      return false;
    }

    const browserPerm = Notification.permission;
    if (browserPerm === 'granted') {
      setPermission('granted');
      return true;
    }

    if (browserPerm === 'denied') {
      alert('You have previously denied notification permissions. Please enable them in your browser settings.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        alert('Notification permission was denied. Please enable notifications in your browser settings.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      alert('Failed to request notification permission.');
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    const permGranted = await requestPermission();
    if (!permGranted) return false;

    try {
      let key = vapidPublicKey;
      if (!key) {
        key = await fetchVapidKey();
        if (!key) {
          alert('Push notifications are not configured. Contact the administrator.');
          return false;
        }
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register(SW_PATH);
      }
      await navigator.serviceWorker.ready;

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const subJson = subscription.toJSON();

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSubscribed(true);
        setDeviceCount(data.deviceCount || 1);
        console.log(`Subscribed to push notifications. Devices: ${data.deviceCount}`);
        return true;
      }
      console.error('Failed to subscribe:', data.error || 'Unknown error');
      alert(data.error || 'Failed to subscribe to push notifications.');
      return false;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to subscribe to push notifications.');
      return false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register(SW_PATH);
      }
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint }),
        });
      } else {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          credentials: 'include',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      setIsSubscribed(false);
      setDeviceCount(0);
      setPermission('default');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  return {
    permission,
    isSubscribed,
    deviceCount,
    appStatus,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
