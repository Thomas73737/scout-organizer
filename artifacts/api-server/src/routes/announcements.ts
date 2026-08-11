import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { CreateAnnouncementBody, CreateAnnouncementReplyBody } from "@workspace/api-zod";
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
    await supabase.from("scout_profiles").insert({
      id: randomUUID(),
      userId,
      role: "scout",
    });
  }
}

async function getReplyWithAuthor(reply: any) {
  const { data: author } = await supabase
    .from("users")
    .select("firstName, lastName, profileImageUrl")
    .eq("id", reply.authorUserId)
    .single();
  return {
    ...reply,
    authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
    authorImageUrl: author?.profileImageUrl ?? null,
  };
}

async function enrichAnnouncementsWithReplies(announcements: any[]) {
  if (announcements.length === 0) return [];

  const { data: replies } = await supabase
    .from("announcement_replies")
    .select("*")
    .in("announcementId", announcements.map((a) => a.id))
    .order("createdAt", { ascending: true });

  const repliesByAnnouncement = new Map<string, any[]>();
  if (replies && replies.length > 0) {
    const authorIds = [...new Set(replies.map((r) => r.authorUserId))];
    const { data: authors } = await supabase
      .from("users")
      .select("id, firstName, lastName, profileImageUrl")
      .in("id", authorIds);
    const authorMap = new Map((authors ?? []).map((u) => [u.id, u]));

    for (const reply of replies) {
      const author = authorMap.get(reply.authorUserId);
      const entry = {
        ...reply,
        authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
        authorImageUrl: author?.profileImageUrl ?? null,
      };
      const list = repliesByAnnouncement.get(reply.announcementId) ?? [];
      list.push(entry);
      repliesByAnnouncement.set(reply.announcementId, list);
    }
  }

  return announcements.map((a) => ({
    ...a,
    replies: repliesByAnnouncement.get(a.id) ?? [],
  }));
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

  const withReplies = await enrichAnnouncementsWithReplies(enrichedAnnouncements);

  res.json(withReplies);
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

router.get("/announcements/:announcementId/replies", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const announcementId = req.params.announcementId;
  const { data: replies } = await supabase
    .from("announcement_replies")
    .select("*")
    .eq("announcementId", announcementId)
    .order("createdAt", { ascending: true });

  if (!replies) {
    res.json([]);
    return;
  }

  const enriched = await Promise.all(replies.map(getReplyWithAuthor));
  res.json(enriched);
});

router.post("/announcements/:announcementId/replies", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const announcementId = req.params.announcementId;
  const { data: announcement } = await supabase
    .from("announcements")
    .select("id")
    .eq("id", announcementId)
    .single();

  if (!announcement) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  const parsed = CreateAnnouncementReplyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const reply = {
    id: randomUUID(),
    announcementId,
    authorUserId: req.user.id,
    content: parsed.data.content,
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("announcement_replies").insert(reply);
  if (error) {
    console.error("Failed to create announcement reply:", error.message);
    res.status(500).json({ error: "Failed to create reply" });
    return;
  }

  const enriched = await getReplyWithAuthor(reply);
  res.status(201).json(enriched);
});

router.delete("/announcements/:announcementId/replies/:replyId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { announcementId, replyId } = req.params;
  const { data: reply } = await supabase
    .from("announcement_replies")
    .select("*")
    .eq("id", replyId)
    .eq("announcementId", announcementId)
    .single();

  if (!reply) {
    res.status(404).json({ error: "Reply not found" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess && reply.authorUserId !== req.user.id) {
    res.status(403).json({ error: "You can only delete your own replies" });
    return;
  }

  await supabase.from("announcement_replies").delete().eq("id", replyId);
  res.json({ success: true });
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
