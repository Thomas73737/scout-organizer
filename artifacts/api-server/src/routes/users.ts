import { Router } from "express";
import { UserModel, ScoutProfileModel } from "@workspace/db";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { createSession } from "../lib/auth";

const router = Router();

async function ensureProfile(userId: string) {
  const existing = await ScoutProfileModel.findOne({ userId });
  if (!existing) {
    await ScoutProfileModel.create({ id: randomUUID(), userId, role: "scout" });
  }
}

async function getUserWithRole(userId: string) {
  const [user, profile] = await Promise.all([
    UserModel.findOne({ id: userId }),
    ScoutProfileModel.findOne({ userId }),
  ]);

  if (!user || !profile) return null;

  return {
    id: profile.id,
    replitId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: profile.role,
    patrol: user.patrol,
    whatsappNumber: user.whatsappNumber,
    parentsWhatsappNumber: user.parentsWhatsappNumber,
    homeAddress: user.homeAddress,
    createdAt: profile.createdAt,
  };
}

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader";
}

async function isDeveloper(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer";
}

router.get("/users", async (req, res) => {
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

  const profiles = await ScoutProfileModel.find().sort({ createdAt: -1 });
  const users = await Promise.all(
    profiles.map(async (profile) => {
      const user = await UserModel.findOne({ id: profile.userId });
      return {
        id: profile.id,
        replitId: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        profileImageUrl: user?.profileImageUrl,
        role: profile.role,
        patrol: user?.patrol,
        createdAt: profile.createdAt,
      };
    })
  );

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

  const scoutCount = await ScoutProfileModel.countDocuments({ role: "scout" });
  const leaderCount = await ScoutProfileModel.countDocuments({ role: "leader" });
  const developerCount = await ScoutProfileModel.countDocuments({ role: "developer" });

  res.json({
    totalScouts: scoutCount,
    totalLeaders: leaderCount,
    totalDevelopers: developerCount,
    totalMembers: scoutCount + leaderCount + developerCount,
  });
});

router.patch("/users/:userId/role", async (req, res) => {
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

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const targetUserId = req.params.userId;
  const targetUser = await UserModel.findOne({ id: targetUserId });

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await ensureProfile(targetUserId);
  await ScoutProfileModel.findOneAndUpdate(
    { userId: targetUserId },
    { role: parsed.data.role }
  );

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

router.patch("/users/:userId/patrol", async (req, res) => {
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

  const { patrol } = req.body as { patrol?: string };
  
  if (!patrol) {
    res.status(400).json({ error: "patrol is required" });
    return;
  }

  const validPatrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];
  if (!validPatrols.includes(patrol)) {
    res.status(400).json({ error: "Invalid patrol" });
    return;
  }

  const targetUserId = req.params.userId;
  const targetUser = await UserModel.findOne({ id: targetUserId });

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  targetUser.patrol = patrol;
  targetUser.updatedAt = new Date();
  await targetUser.save();

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

// Login endpoint for form-based authentication
router.post("/users/login", async (req, res) => {
  const { name, password } = req.body as {
    name?: string;
    password?: string;
  };

  if (!name || !password) {
    res.status(400).json({ error: "name and password are required" });
    return;
  }

  // Validate three-part name for login - reject if only first name
  // Exception: sofsafaSVS account can login with first name only
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length < 3 && name.toLowerCase() !== 'sofsafasvs') {
    res.status(400).json({ error: "Please enter your full three-part name (e.g., youssef miro soshi). First name only is not accepted." });
    return;
  }

  const trimmedName = name.trim();
  const trimmedPassword = password.trim();

  try {
    // Check if user exists with this name (require three-part name match)
    const nameParts = trimmedName.split(/\s+/);
    let user;
    
    // Special handling for sofsafaSVS account
    if (trimmedName.toLowerCase() === 'sofsafasvs') {
      console.log("Attempting sofsafaSVS admin login");
      user = await UserModel.findOne({ firstName: 'sofsafaSVS' });
      console.log("Found user with firstName 'sofsafaSVS':", user ? "Yes" : "No");
      
      if (!user) {
        user = await UserModel.findOne({ firstName: 'sofsafasvs' });
        console.log("Found user with firstName 'sofsafasvs':", user ? "Yes" : "No");
      }
      
      if (!user) {
        // Try finding by email as fallback
        user = await UserModel.findOne({ email: 'sofsafaSVS' });
        console.log("Found user with email 'sofsafaSVS':", user ? "Yes" : "No");
      }
      
      if (!user) {
        console.log("sofsafaSVS user not found in database");
        res.status(404).json({ error: "Admin account not found. Please create the sofsafaSVS admin account first." });
        return;
      }
      
      // Check if user is banned
      if (user.status === "banned") {
        res.status(403).json({ error: "This account has been banned" });
        return;
      }
      
      console.log("sofsafaSVS user found:", user.firstName, user.email);
    } else {
      // Regular three-part name handling for other users
      // Try exact match with firstName + lastName (which contains middle + last)
      // This is the preferred method since users are required to enter three-part names
      user = await UserModel.findOne({ 
        $expr: { $eq: [{ $concat: ["$firstName", " ", "$lastName"] }, trimmedName] } 
      });
      
      // If not found with exact match, try matching just the first name
      // This provides a fallback for users who might enter their name differently
      if (!user) {
        user = await UserModel.findOne({ firstName: nameParts[0] });
      }
      
      if (!user) {
        res.status(404).json({ error: "User not found. Please submit an access request first. Make sure to enter your full three-part name (e.g., youssef miro soshi)." });
        return;
      }
    }

    // Check password matches (in production, use proper password hashing)
    if (user.password !== trimmedPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    // Check user status - treat undefined as approved for backward compatibility
    if (user.status === "pending") {
      res.status(403).json({ 
        error: "Your account is pending approval. Please wait for an admin to approve your request.",
        status: "pending"
      });
      return;
    }

    if (user.status === "denied") {
      res.status(403).json({ 
        error: "Your account request was denied. Please contact an admin for more information.",
        status: "denied"
      });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ 
        error: "This account has been banned",
        status: "banned"
      });
      return;
    }

    // If status is undefined or not set, treat as approved
    if (!user.status) {
      // Auto-approve users with undefined status for backward compatibility
      user.status = "approved";
      await user.save();
    }

    // Ensure user has a profile
    await ensureProfile(user.id!);
    const profile = await getUserWithRole(user.id!);
    
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    // Create session
    const sessionData = {
      user: {
        id: user.id,
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
      },
      access_token: "mock_token_" + randomUUID(),
      // Don't set expires_at for form-based auth (let DB TTL handle it)
    };

    const sid = await createSession(sessionData);
    
    // Set session cookie
    res.cookie("sid", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Login successful",
      user: profile,
      isAdmin: profile.role === "leader"
    });
  } catch (err: any) {
    console.error("Login failed:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Temporary endpoint to create admin account (REMOVE IN PRODUCTION)
router.post("/users/create-admin", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  try {
    // Check if admin already exists
    const existingAdmin = await UserModel.findOne({ 
      $or: [
        { firstName: name },
        { email: email }
      ]
    });

    if (existingAdmin) {
      res.status(400).json({ error: "Admin account already exists" });
      return;
    }

    // Create admin user
    const adminUserId = randomUUID();
    const adminUser = await UserModel.create({
      id: adminUserId,
      firstName: name,
      lastName: "Admin",
      email: email,
      password: password, // In production, this should be hashed
      phone: "0000000000", // Temporary phone number
      section: "كشافة", // Default section
      team: "A", // Default team
      status: "approved",
    });

    // Create admin profile with leader role
    await ScoutProfileModel.create({
      id: randomUUID(),
      userId: adminUserId,
      role: "leader",
    });

    console.log("Admin account created successfully:", name, email);
    res.json({ 
      message: "Admin account created successfully",
      userId: adminUserId,
      name: name,
      email: email
    });
  } catch (err: any) {
    console.error("Failed to create admin account:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Check user approval status endpoint
router.post("/users/check-status", async (req, res) => {
  const { email } = req.body as {
    email?: string;
  };

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const trimmedEmail = email.trim();

  try {
    const user = await UserModel.findOne({ email: trimmedEmail });
    
    if (!user) {
      res.status(404).json({ error: "User not found", status: "not_found" });
      return;
    }

    res.json({ 
      status: user.status || "approved",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err: any) {
    console.error("Failed to check user status:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Ban user
router.post("/users/ban", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId } = req.body as {
    userId?: string;
  };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.status = "banned";
    await user.save();

    console.log(`User ${userId} banned by ${req.user.id}`);
    res.json({ message: "User banned successfully", userId: user.id });
  } catch (err: any) {
    console.error("Failed to ban user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Change user role
router.post("/users/change-role", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId, newRole } = req.body as {
    userId?: string;
    newRole?: string;
  };

  if (!userId || !newRole) {
    res.status(400).json({ error: "userId and newRole are required" });
    return;
  }

  if (!["scout", "leader", "developer"].includes(newRole)) {
    res.status(400).json({ error: "Invalid role. Must be scout, leader, or developer" });
    return;
  }

  try {
    const profile = await ScoutProfileModel.findOne({ userId });
    if (!profile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    profile.role = newRole as any;
    await profile.save();

    console.log(`User ${userId} role changed to ${newRole} by ${req.user.id}`);
    res.json({ message: "User role changed successfully", userId, newRole });
  } catch (err: any) {
    console.error("Failed to change user role:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Unban user
router.post("/users/unban", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId } = req.body as {
    userId?: string;
  };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.status = "approved";
    await user.save();

    console.log(`User ${userId} unbanned by ${req.user.id}`);
    res.json({ message: "User unbanned successfully", userId: user.id });
  } catch (err: any) {
    console.error("Failed to unban user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Delete user account
router.delete("/users/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloper(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers only" });
    return;
  }

  const targetUserId = req.params.userId;

  // Prevent developers from deleting themselves
  if (targetUserId === req.user.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  try {
    const user = await UserModel.findOne({ id: targetUserId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete user profile
    await ScoutProfileModel.deleteOne({ userId: targetUserId });

    // Delete user account
    await UserModel.deleteOne({ id: targetUserId });

    console.log(`User ${targetUserId} deleted by developer ${req.user.id}`);
    res.json({ message: "User deleted successfully", userId: targetUserId });
  } catch (err: any) {
    console.error("Failed to delete user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Temporary endpoint to update admin password (REMOVE IN PRODUCTION)
router.post("/users/update-admin-password", async (req, res) => {
  const { email, newPassword } = req.body as {
    email?: string;
    newPassword?: string;
  };

  if (!email || !newPassword) {
    res.status(400).json({ error: "email and newPassword are required" });
    return;
  }

  try {
    const user = await UserModel.findOne({ email: email });
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log(`Password updated for user: ${email}`);
    res.json({ message: "Password updated successfully", email: email });
  } catch (err: any) {
    console.error("Failed to update password:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
