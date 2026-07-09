import { Router } from "express";
import { supabase } from "@workspace/db";

const router = Router();

router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("userId", req.user.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("userId", req.user.id)
    .eq("isRead", false);

  res.json({ notifications: notifications || [], unreadCount: unreadCount || 0 });
});

router.post("/notifications/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await supabase
    .from("notifications")
    .update({ isRead: true })
    .eq("id", req.params.id)
    .eq("userId", req.user.id);

  res.json({ success: true });
});

router.post("/notifications/read-all", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await supabase
    .from("notifications")
    .update({ isRead: true })
    .eq("userId", req.user.id)
    .eq("isRead", false);

  res.json({ success: true });
});

export default router;
