import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { PushSubscriptionModel } from "@workspace/db";
import { getVapidPublicKey } from "../lib/pushNotification";

const router = Router();

const SubscribeBody = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
});

router.post("/push/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription", details: parsed.error.issues });
    return;
  }

  try {
    const existing = await PushSubscriptionModel.findOne({
      userId: req.user.id,
      endpoint: parsed.data.endpoint,
    });

    if (existing) {
      res.json({ success: true, subscribed: true });
      return;
    }

    await PushSubscriptionModel.create({
      id: randomUUID(),
      userId: req.user.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      userAgent: parsed.data.userAgent,
    });

    const count = await PushSubscriptionModel.countDocuments({ userId: req.user.id });
    console.log(`Push subscription saved for user ${req.user.id}. Total devices: ${count}`);
    res.json({ success: true, subscribed: true, deviceCount: count });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

router.delete("/push/unsubscribe", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { endpoint } = req.body;

  try {
    if (endpoint) {
      await PushSubscriptionModel.deleteOne({ userId: req.user.id, endpoint });
    } else {
      await PushSubscriptionModel.deleteMany({ userId: req.user.id });
    }

    const count = await PushSubscriptionModel.countDocuments({ userId: req.user.id });
    console.log(`Push subscription removed for user ${req.user.id}. Remaining devices: ${count}`);
    res.json({ success: true, deviceCount: count });
  } catch (error) {
    console.error("Failed to remove push subscription:", error);
    res.status(500).json({ error: "Failed to remove push subscription" });
  }
});

router.get("/push/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const count = await PushSubscriptionModel.countDocuments({ userId: req.user.id });
    res.json({ subscribed: count > 0, deviceCount: count });
  } catch (error) {
    console.error("Failed to get push status:", error);
    res.status(500).json({ error: "Failed to get push status" });
  }
});

router.get("/push/vapid-public-key", (_req, res) => {
  try {
    res.json({ publicKey: getVapidPublicKey() });
  } catch {
    res.status(500).json({ error: "VAPID public key not configured" });
  }
});

export default router;
