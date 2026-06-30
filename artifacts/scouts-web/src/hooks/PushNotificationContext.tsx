import { createContext, useContext, type ReactNode } from 'react';
import { usePushNotifications } from './usePushNotifications';

interface PushNotificationContextType {
  permission: NotificationPermission;
  isSubscribed: boolean;
  deviceCount: number;
  appStatus: string;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export function PushNotificationProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const push = usePushNotifications(userId);
  return (
    <PushNotificationContext.Provider value={push}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext(): PushNotificationContextType {
  const ctx = useContext(PushNotificationContext);
  if (!ctx) {
    throw new Error('usePushNotificationContext must be used within a PushNotificationProvider');
  }
  return ctx;
}
