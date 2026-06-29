import mongoose from "mongoose";
import crypto, { randomUUID } from "crypto";
import { UserModel, ScoutProfileModel } from "../lib/db/src/schema";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");
  return `$scrypt$${salt}$${hash}`;
}

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB");

    // Check if admin user already exists
    const adminEmail = process.env.ADMIN_EMAIL || "admin@scout-organizer.com";
    const existingUser = await UserModel.findOne({ email: adminEmail });

    if (existingUser) {
      console.log("User with email already exists:", adminEmail);
      
      // Check if they already have a leader profile
      const existingProfile = await ScoutProfileModel.findOne({ userId: existingUser.id });
      if (existingProfile && existingProfile.role === "leader") {
        console.log("User already has leader role");
        process.exit(0);
      }
      
      // Update existing user to leader role
      if (existingProfile) {
        existingProfile.role = "leader";
        await existingProfile.save();
        console.log("Updated existing user to leader role");
      } else {
        await ScoutProfileModel.create({
          id: randomUUID(),
          userId: existingUser.id!,
          role: "leader",
        });
        console.log("Created leader profile for existing user");
      }
    } else {
      // Create new admin user
      const adminId = randomUUID();
      const adminUser = await UserModel.create({
        id: adminId,
        email: adminEmail,
        firstName: "Admin",
        lastName: "User",
        password: hashPassword(ADMIN_PASSWORD),
        phone: "+1234567890",
        section: "كشافة",
        team: "A",
        status: "approved",
      });

      await ScoutProfileModel.create({
        id: randomUUID(),
        userId: adminId,
        role: "leader",
      });

      console.log("Created new admin user:");
      console.log("  Email:", adminEmail);
      console.log("  Password:", ADMIN_PASSWORD);
      console.log("  User ID:", adminId);
      console.log("  Role: leader");
    }

    console.log("\nAdmin setup complete!");
    console.log("You can now use this user to access admin features.");
    
  } catch (error) {
    console.error("Error setting up admin:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setupAdmin();