import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { scoutProfilesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { UpdateUserRoleBody } from "@workspace/api-zod";

const router = Router();

async function ensureProfile(userId: string) {
  const existing = await db
    .select()
    .from(scoutProfilesTable)
    .where(eq(scoutProfilesTable.userId, userId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(scoutProfilesTable).values({ userId, role: "scout" });
  }
}

async function getUserWithRole(userId: string) {
  const user = await db
    .select({
      id: scoutProfilesTable.id,
      replitId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profileImageUrl: usersTable.profileImageUrl,
      role: scoutProfilesTable.role,
      createdAt: scoutProfilesTable.createdAt,
    })
    .from(usersTable)
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user[0] || null;
}

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getUserWithRole(req.user.id);
  if (!profile || profile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const users = await db
    .select({
      id: scoutProfilesTable.id,
      replitId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profileImageUrl: usersTable.profileImageUrl,
      role: scoutProfilesTable.role,
      createdAt: scoutProfilesTable.createdAt,
    })
    .from(usersTable)
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .orderBy(scoutProfilesTable.createdAt);

  res.json(users);
});

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getUserWithRole(req.user.id);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.get("/users/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [scoutCount] = await db
    .select({ count: count() })
    .from(scoutProfilesTable)
    .where(eq(scoutProfilesTable.role, "scout"));

  const [leaderCount] = await db
    .select({ count: count() })
    .from(scoutProfilesTable)
    .where(eq(scoutProfilesTable.role, "leader"));

  res.json({
    totalScouts: Number(scoutCount?.count ?? 0),
    totalLeaders: Number(leaderCount?.count ?? 0),
    totalMembers: Number(scoutCount?.count ?? 0) + Number(leaderCount?.count ?? 0),
  });
});

router.patch("/users/:userId/role", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const myProfile = await getUserWithRole(req.user.id);
  if (!myProfile || myProfile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const targetUserId = req.params.userId;
  const targetUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId))
    .limit(1);

  if (targetUser.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await ensureProfile(targetUserId);
  await db
    .update(scoutProfilesTable)
    .set({ role: parsed.data.role })
    .where(eq(scoutProfilesTable.userId, targetUserId));

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

export default router;
