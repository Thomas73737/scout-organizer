import { Router } from "express";
import { supabase } from "@workspace/db";
import { mainBadgeEnum, proficiencyBadgeEnum, hobbyBadgeEnum } from "@workspace/db/types";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader";
}

// GET /api/badges/:userId - Get a user's badges (public)
router.get("/badges/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("mainBadge, proficiencyBadges, hobbyBadges")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    mainBadge: user.mainBadge || null,
    proficiencyBadges: user.proficiencyBadges || [],
    hobbyBadges: user.hobbyBadges || [],
  });
});

// PUT /api/badges/:userId/main-badge - Set main badge (admin only)
router.put("/badges/:userId/main-badge", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { badge } = req.body as { badge?: string };
  if (!badge || !mainBadgeEnum.includes(badge as any)) {
    res.status(400).json({ error: "Invalid main badge" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await supabase
    .from("users")
    .update({ mainBadge: badge, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ mainBadge: badge });
});

// DELETE /api/badges/:userId/main-badge - Remove main badge (admin only)
router.delete("/badges/:userId/main-badge", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await supabase
    .from("users")
    .update({ mainBadge: null, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ mainBadge: null });
});

// POST /api/badges/:userId/proficiency - Add proficiency badge (admin only)
router.post("/badges/:userId/proficiency", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { badge } = req.body as { badge?: string };
  if (!badge || !proficiencyBadgeEnum.includes(badge as any)) {
    res.status(400).json({ error: "Invalid proficiency badge" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, proficiencyBadges")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentBadges = user.proficiencyBadges || [];
  if (currentBadges.includes(badge as any)) {
    res.status(400).json({ error: "Badge already assigned" });
    return;
  }

  const updatedBadges = [...currentBadges, badge];
  await supabase
    .from("users")
    .update({ proficiencyBadges: updatedBadges, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ proficiencyBadges: updatedBadges });
});

// DELETE /api/badges/:userId/proficiency/:badgeName - Remove proficiency badge (admin only)
router.delete("/badges/:userId/proficiency/:badgeName", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const badgeName = decodeURIComponent(req.params.badgeName);
  const { data: user } = await supabase
    .from("users")
    .select("id, proficiencyBadges")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updatedBadges = (user.proficiencyBadges || []).filter((b: string) => b !== badgeName);
  await supabase
    .from("users")
    .update({ proficiencyBadges: updatedBadges, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ proficiencyBadges: updatedBadges });
});

// POST /api/badges/:userId/hobby - Add hobby badge (admin only)
router.post("/badges/:userId/hobby", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { badge } = req.body as { badge?: string };
  if (!badge || !hobbyBadgeEnum.includes(badge as any)) {
    res.status(400).json({ error: "Invalid hobby badge" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, hobbyBadges")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentBadges = user.hobbyBadges || [];
  if (currentBadges.includes(badge as any)) {
    res.status(400).json({ error: "Badge already assigned" });
    return;
  }

  const updatedBadges = [...currentBadges, badge];
  await supabase
    .from("users")
    .update({ hobbyBadges: updatedBadges, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ hobbyBadges: updatedBadges });
});

// DELETE /api/badges/:userId/hobby/:badgeName - Remove hobby badge (admin only)
router.delete("/badges/:userId/hobby/:badgeName", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const badgeName = decodeURIComponent(req.params.badgeName);
  const { data: user } = await supabase
    .from("users")
    .select("id, hobbyBadges")
    .eq("id", req.params.userId)
    .single();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updatedBadges = (user.hobbyBadges || []).filter((b: string) => b !== badgeName);
  await supabase
    .from("users")
    .update({ hobbyBadges: updatedBadges, updatedAt: new Date().toISOString() })
    .eq("id", req.params.userId);

  res.json({ hobbyBadges: updatedBadges });
});

export default router;
