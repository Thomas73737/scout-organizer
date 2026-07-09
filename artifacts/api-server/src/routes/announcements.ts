import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { CreateAnnouncementBody } from "@workspace/api-zod";
import { sendPushNotificationToMany } from "../lib/pushNotification";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader" || data?.role === "cp_of_cps";
}

async function ensureProfile(userId: string) {
  const { data: existing } = await supabase
    .from("scout_profiles")
    .select("id")
    .eq("userId", userId)
    .single();
  if (!existing) {
    await supabase.from("scout_profiles").insert({
      id: randomUUID(),
      userId,
      role: "scout",
    });
  }
}

router.get("/announcements", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("createdAt", { ascending: false });

  if (!announcements) {
    res.json([]);
    return;
  }

  // Enrich with author information
  const enrichedAnnouncements = await Promise.all(
    announcements.map(async (announcement) => {
      const { data: author } = await supabase
        .from("users")
        .select("firstName, lastName, profileImageUrl")
        .eq("id", announcement.authorUserId)
        .single();
      return {
        ...announcement,
        authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
        authorImageUrl: author?.profileImageUrl ?? null,
      };
    })
  );

  res.json(enrichedAnnouncements);
});

router.post("/announcements", async (req, res) => {
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

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const announcementId = randomUUID();
  await supabase.from("announcements").insert({
    id: announcementId,
    title: parsed.data.title,
    content: parsed.data.content,
    authorUserId: req.user.id,
  });

  const { data: author } = await supabase
    .from("users")
    .select("firstName, lastName, profileImageUrl")
    .eq("id", req.user.id)
    .single();
  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";

  // Create notifications for all users except the author
  try {
    const { data: allUsers } = await supabase
      .from("users")
      .select("id")
      .neq("id", req.user.id);

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map((user) => ({
        id: randomUUID(),
        userId: user.id,
        type: "announcement" as const,
        title: "New Announcement",
        message: parsed.data.title,
        relatedId: announcementId,
        authorName,
        isRead: false,
      }));
      await supabase.from("notifications").insert(notifications);

      // Send push notifications
      try {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .in("userId", allUsers.map((u) => u.id));

        if (subscriptions && subscriptions.length > 0) {
          const pushData = subscriptions.map((sub) => ({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
          }));

          const result = await sendPushNotificationToMany(
            pushData,
            "New Announcement",
            `${authorName} posted: ${parsed.data.title}`,
            {
              type: "announcement",
              announcementId,
              url: "/announcements",
            },
          );

          console.log(`Push notifications sent: ${result.successful} successful, ${result.failed.length} failed`);

          // Remove expired subscriptions
          if (result.failed.length > 0) {
            const expiredEndpoints = result.failed.map((f) => f.subscription.endpoint);
            await supabase
              .from("push_subscriptions")
              .delete()
              .in("endpoint", expiredEndpoints);
            console.log(`Removed ${result.failed.length} expired subscriptions`);
          }
        } else {
          console.log("No push subscriptions found");
        }
      } catch (pushError) {
        console.error("Failed to send push notifications:", pushError);
      }
    }
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }

  res.status(201).json({
    id: announcementId,
    title: parsed.data.title,
    content: parsed.data.content,
    authorUserId: req.user.id,
    createdAt: new Date().toISOString(),
    authorName,
    authorImageUrl: author?.profileImageUrl ?? null,
  });
});

router.delete("/announcements/:announcementId", async (req, res) => {
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

  const announcementId = req.params.announcementId;
  if (!announcementId) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await supabase.from("announcements").delete().eq("id", announcementId);
  res.json({ success: true });
});

export default router;
