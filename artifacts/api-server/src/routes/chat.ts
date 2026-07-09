import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { sendPushNotificationToMany } from "../lib/pushNotification";

const router = Router();

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

router.get("/chat/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const userId = req.user.id;
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
    .order("createdAt", { ascending: false });

  if (!messages) {
    res.json([]);
    return;
  }

  const userIds = new Set<string>();
  for (const msg of messages) {
    if (msg.senderId !== userId) userIds.add(msg.senderId);
    if (msg.receiverId !== userId) userIds.add(msg.receiverId);
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, firstName, lastName, profileImageUrl")
    .in("id", Array.from(userIds));

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const conversationMap = new Map<string, { userId: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null; lastMessage: string; lastMessageTime: Date; unreadCount: number }>();

  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const other = userMap.get(otherId);
    const lastMsg = msg.isDeleted ? "Message deleted" : msg.content;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        userId: otherId,
        firstName: other?.firstName ?? null,
        lastName: other?.lastName ?? null,
        profileImageUrl: other?.profileImageUrl ?? null,
        lastMessage: lastMsg,
        lastMessageTime: new Date(msg.createdAt!),
        unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0,
      });
    } else {
      const conv = conversationMap.get(otherId)!;
      if (msg.receiverId === userId && !msg.isRead) {
        conv.unreadCount += 1;
      }
    }
  }

  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

  res.json(conversations);
});

router.get("/chat/messages/:otherUserId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { otherUserId } = req.params;
  const userId = req.user.id;

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .or(
      `and(senderId.eq.${userId},receiverId.eq.${otherUserId}),and(senderId.eq.${otherUserId},receiverId.eq.${userId})`
    )
    .order("createdAt", { ascending: true });

  const userIds = [userId, otherUserId];
  const { data: users } = await supabase
    .from("users")
    .select("id, firstName, lastName, profileImageUrl")
    .in("id", userIds);
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  const replyToIds = (messages || []).map((m) => m.replyToId).filter(Boolean) as string[];
  let replyToMap = new Map<string, { content: string; senderName: string }>();
  if (replyToIds.length > 0) {
    const { data: repliedMessages } = await supabase
      .from("chat_messages")
      .select("id, content, senderId, isDeleted")
      .in("id", replyToIds);
    for (const rm of repliedMessages || []) {
      const ru = userMap.get(rm.senderId);
      const rn = ru ? `${ru.firstName ?? ""} ${ru.lastName ?? ""}`.trim() : "Unknown";
      const rc = rm.isDeleted ? "Message deleted" : rm.content;
      replyToMap.set(rm.id, { content: rc, senderName: rn });
    }
  }

  const enriched = (messages || []).map((msg) => ({
    ...msg,
    senderName: userMap.get(msg.senderId) ? `${userMap.get(msg.senderId)!.firstName ?? ""} ${userMap.get(msg.senderId)!.lastName ?? ""}`.trim() : null,
    senderImageUrl: userMap.get(msg.senderId)?.profileImageUrl ?? null,
    isEdited: msg.isEdited ?? false,
    isDeleted: msg.isDeleted ?? false,
    replyTo: msg.replyToId ? (replyToMap.get(msg.replyToId) ?? null) : null,
  }));

  await supabase
    .from("chat_messages")
    .update({ isRead: true })
    .eq("senderId", otherUserId)
    .eq("receiverId", userId)
    .eq("isRead", false);

  res.json(enriched);
});

router.post("/chat/send", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { receiverId, content, replyToId } = req.body as { receiverId?: string; content?: string; replyToId?: string };
  if (!receiverId || !content) {
    res.status(400).json({ error: "receiverId and content are required" });
    return;
  }

  const { data: receiver } = await supabase
    .from("users")
    .select("id")
    .eq("id", receiverId)
    .single();
  if (!receiver) {
    res.status(404).json({ error: "Receiver not found" });
    return;
  }

  const messageId = randomUUID();
  const messageData = {
    id: messageId,
    senderId: req.user.id,
    receiverId,
    content,
    isRead: false,
    replyToId: replyToId || null,
    createdAt: new Date().toISOString(),
  };

  await supabase.from("chat_messages").insert(messageData);

  const { data: sender } = await supabase
    .from("users")
    .select("firstName, lastName")
    .eq("id", req.user.id)
    .single();
  const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "Unknown";

  await supabase.from("notifications").insert({
    id: randomUUID(),
    userId: receiverId,
    type: "message",
    title: "New Message",
    message: content,
    relatedId: messageId,
    authorName: senderName,
    isRead: false,
  });

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keyP256dh, keyAuth")
    .eq("userId", receiverId);

  if (subscriptions && subscriptions.length > 0) {
    const pushResult = await sendPushNotificationToMany(
      subscriptions.map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.keyP256dh, auth: s.keyAuth } })),
      senderName,
      content,
      { type: "message", messageId, url: "/chat" },
    );
    if (pushResult.failed.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", pushResult.failed.map((f) => f.subscription.endpoint));
    }
  }

  res.status(201).json(messageData);
});

router.put("/chat/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;
  const { content } = req.body as { content?: string };
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const { data: message } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await supabase
    .from("chat_messages")
    .update({ content: content.trim(), isEdited: true })
    .eq("id", messageId);

  res.json({ ...message, content: content.trim(), isEdited: true });
});

router.delete("/chat/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;

  const { data: message } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .single();
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await supabase
    .from("chat_messages")
    .update({ content: "This message was deleted", isDeleted: true, isEdited: false })
    .eq("id", messageId);

  res.json({ success: true });
});

router.get("/chat/unread-count", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { count } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiverId", req.user.id)
    .eq("isRead", false);

  res.json({ unreadCount: count || 0 });
});

export default router;
