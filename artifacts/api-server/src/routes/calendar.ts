import { Router } from "express";
import { randomUUID } from "crypto";
import { CalendarEventModel, UserModel, ScoutProfileModel, AnnouncementModel, NotificationModel, PushSubscriptionModel } from "@workspace/db";
import { sendPushNotificationToMany } from "../lib/pushNotification";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader" || profile?.role === "cp_of_cps";
}

async function ensureProfile(userId: string) {
  const existing = await ScoutProfileModel.findOne({ userId });
  if (!existing) {
    await ScoutProfileModel.create({ id: randomUUID(), userId, role: "scout" });
  }
}

async function createAnnouncementForEvent(
  eventTitle: string,
  notes: string,
  date: string,
  time: string,
  place: string,
  authorUserId: string,
) {
  const content = [
    `📅 ${eventTitle}`,
    date ? `📆 Date: ${date}` : "",
    time ? `⏰ Time: ${time}` : "",
    place ? `📍 Place: ${place}` : "",
    notes ? `📝 ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const announcement = await AnnouncementModel.create({
    id: randomUUID(),
    title: `📢 ${eventTitle}`,
    content,
    authorUserId,
  });

  const author = await UserModel.findOne({ id: authorUserId }).lean();
  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";

  try {
    const allUsers = await UserModel.find({ id: { $ne: authorUserId } }).lean();
    const notifications = allUsers.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      type: "announcement" as const,
      title: "New Calendar Event",
      message: eventTitle,
      relatedId: announcement.id,
      authorName,
      isRead: false,
    }));
    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }

    try {
      const subscriptions = await PushSubscriptionModel.find({
        userId: { $in: allUsers.map((u) => u.id) },
      }).lean();

      if (subscriptions.length > 0) {
        const pushData = subscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys!.p256dh, auth: sub.keys!.auth },
        }));

        await sendPushNotificationToMany(
          pushData,
          "New Calendar Event",
          `${authorName} added: ${eventTitle}`,
          {
            type: "announcement",
            announcementId: announcement.id,
            url: "/calendar",
          },
        );
      }
    } catch (pushError) {
      console.error("Failed to send push for calendar event:", pushError);
    }
  } catch (err) {
    console.error("Failed to create notifications for calendar event:", err);
  }
}

router.get("/calendar", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const events = await CalendarEventModel.find()
    .sort({ date: 1 })
    .lean();

  res.json(events);
});

router.post("/calendar", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { title, date, time, place, notes, sendAnnouncement } = req.body as {
    title?: string;
    date?: string;
    time?: string;
    place?: string;
    notes?: string;
    sendAnnouncement?: boolean;
  };

  if (!title || !date) {
    res.status(400).json({ error: "title and date are required" });
    return;
  }

  const event = await CalendarEventModel.create({
    id: randomUUID(),
    title,
    date,
    time: time || "",
    place: place || "",
    notes: notes || "",
    createdByUserId: req.user.id,
  });

  if (sendAnnouncement) {
    await createAnnouncementForEvent(title, notes || "", date, time || "", place || "", req.user.id);
  }

  res.status(201).json(event.toObject());
});

router.patch("/calendar/:eventId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { eventId } = req.params;
  const { title, date, time, place, notes } = req.body as {
    title?: string;
    date?: string;
    time?: string;
    place?: string;
    notes?: string;
  };

  const update: Record<string, string> = {};
  if (title) update.title = title;
  if (date) update.date = date;
  if (time !== undefined) update.time = time;
  if (place !== undefined) update.place = place;
  if (notes !== undefined) update.notes = notes;

  const event = await CalendarEventModel.findOneAndUpdate(
    { id: eventId },
    update,
    { new: true },
  ).lean();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

router.delete("/calendar/:eventId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { eventId } = req.params;
  await CalendarEventModel.deleteOne({ id: eventId });
  res.json({ success: true });
});

export default router;
