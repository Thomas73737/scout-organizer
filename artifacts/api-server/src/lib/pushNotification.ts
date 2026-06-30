import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@scout-organizer.app";

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY &&
    VAPID_PUBLIC_KEY !== "your_vapid_public_key" &&
    VAPID_PRIVATE_KEY !== "your_vapid_private_key");
}

export function getVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error("VAPID_PUBLIC_KEY environment variable is required");
  }
  return VAPID_PUBLIC_KEY;
}

function ensureConfigured(): void {
  if (!isPushConfigured()) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  title: string,
  message: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!isPushConfigured()) {
    console.log("VAPID keys not configured, skipping push notification");
    return;
  }

  try {
    ensureConfigured();
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify({ title, message, data, icon: "/favicon.svg" }),
    );
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      throw error;
    }
    console.error("Failed to send push notification:", error);
  }
}

export async function sendPushNotificationToMany(
  subscriptions: PushSubscriptionData[],
  title: string,
  message: string,
  data?: Record<string, string>,
): Promise<{ successful: number; failed: Array<{ subscription: PushSubscriptionData; error: any }> }> {
  const result = { successful: 0, failed: [] as Array<{ subscription: PushSubscriptionData; error: any }> };

  if (!isPushConfigured()) {
    console.log("VAPID keys not configured, skipping push notifications");
    return result;
  }

  ensureConfigured();

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub as webpush.PushSubscription,
        JSON.stringify({ title, message, data, icon: "/favicon.svg" }),
      );
      result.successful++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        result.failed.push({ subscription: sub, error });
      } else {
        console.error("Failed to send push notification:", error);
        result.failed.push({ subscription: sub, error });
      }
    }
  }

  return result;
}
