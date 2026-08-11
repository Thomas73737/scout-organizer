import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { sendPushNotificationToMany } from "../lib/pushNotification";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader";
}

async function ensureProfile(userId: string) {
  const { data: existing } = await supabase
    .from("scout_profiles")
    .select("id")
    .eq("userId", userId)
    .single();
  if (!existing) {
    await supabase.from("scout_profiles").insert({ id: randomUUID(), userId, role: "scout" });
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

  const announcementId = randomUUID();
  await supabase.from("announcements").insert({
    id: announcementId,
    title: `📢 ${eventTitle}`,
    content,
    authorUserId,
  });

  const { data: author } = await supabase
    .from("users")
    .select("firstName, lastName")
    .eq("id", authorUserId)
    .single();
  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";

  try {
    const { data: allUsers } = await supabase
      .from("users")
      .select("id")
      .neq("id", authorUserId);

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map((user) => ({
        id: randomUUID(),
        userId: user.id,
        type: "announcement" as const,
        title: "New Calendar Event",
        message: eventTitle,
        relatedId: announcementId,
        authorName,
        isRead: false,
      }));
      await supabase.from("notifications").insert(notifications);

      try {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, keyP256dh, keyAuth")
          .in("userId", allUsers.map((u) => u.id));

        if (subscriptions && subscriptions.length > 0) {
          const pushData = subscriptions.map((sub) => ({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
          }));

          await sendPushNotificationToMany(
            pushData,
            "New Calendar Event",
            `${authorName} added: ${eventTitle}`,
            {
              type: "announcement",
              announcementId,
              url: "/calendar",
            },
          );
        }
      } catch (pushError) {
        console.error("Failed to send push for calendar event:", pushError);
      }
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

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: true });

  res.json(events || []);
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

  const eventData = {
    id: randomUUID(),
    title,
    date,
    time: time || "",
    place: place || "",
    notes: notes || "",
    createdByUserId: req.user.id,
    createdAt: new Date().toISOString(),
  };

  await supabase.from("calendar_events").insert(eventData);

  if (sendAnnouncement) {
    await createAnnouncementForEvent(title, notes || "", date, time || "", place || "", req.user.id);
  }

  res.status(201).json(eventData);
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

  const { data: event } = await supabase
    .from("calendar_events")
    .update(update)
    .eq("id", eventId)
    .select()
    .single();

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
  await supabase.from("calendar_events").delete().eq("id", eventId);
  res.json({ success: true });
});

export default router;
