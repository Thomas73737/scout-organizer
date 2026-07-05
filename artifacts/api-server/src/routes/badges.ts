import { Router } from "express";
import { UserModel, ScoutProfileModel, mainBadgeEnum, proficiencyBadgeEnum, hobbyBadgeEnum } from "@workspace/db";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader" || profile?.role === "cp_of_cps";
}

// GET /api/badges/:userId - Get a user's badges (public)
router.get("/badges/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await UserModel.findOne({ id: req.params.userId });
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

  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.mainBadge = badge as typeof mainBadgeEnum[number];
  user.updatedAt = new Date();
  await user.save();

  res.json({ mainBadge: user.mainBadge });
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

  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.mainBadge = null;
  user.updatedAt = new Date();
  await user.save();

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

  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.proficiencyBadges) user.proficiencyBadges = [];
  if (user.proficiencyBadges.includes(badge as any)) {
    res.status(400).json({ error: "Badge already assigned" });
    return;
  }

  user.proficiencyBadges.push(badge as typeof proficiencyBadgeEnum[number]);
  user.updatedAt = new Date();
  await user.save();

  res.json({ proficiencyBadges: user.proficiencyBadges });
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
  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.proficiencyBadges = (user.proficiencyBadges || []).filter((b) => b !== badgeName);
  user.updatedAt = new Date();
  await user.save();

  res.json({ proficiencyBadges: user.proficiencyBadges });
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

  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.hobbyBadges) user.hobbyBadges = [];
  if (user.hobbyBadges.includes(badge as any)) {
    res.status(400).json({ error: "Badge already assigned" });
    return;
  }

  user.hobbyBadges.push(badge as typeof hobbyBadgeEnum[number]);
  user.updatedAt = new Date();
  await user.save();

  res.json({ hobbyBadges: user.hobbyBadges });
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
  const user = await UserModel.findOne({ id: req.params.userId });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  user.hobbyBadges = (user.hobbyBadges || []).filter((b) => b !== badgeName);
  user.updatedAt = new Date();
  await user.save();

  res.json({ hobbyBadges: user.hobbyBadges });
});

export default router;
