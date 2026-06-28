import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { UserModel, ScoutProfileModel } from "../../lib/db/src/schema";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function promoteToLeader() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB");

    // Get user email from command line or environment
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    
    if (!email) {
      console.error("Please provide an email address as argument or ADMIN_EMAIL environment variable");
      console.log("Usage: ADMIN_EMAIL=user@example.com node scripts/promote-to-leader.ts");
      console.log("Or: node scripts/promote-to-leader.ts user@example.com");
      process.exit(1);
    }

    // Find user by email
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      console.error("User not found with email:", email);
      console.log("User must first log in through the website to be created in the database.");
      process.exit(1);
    }

    console.log("Found user:", user.email, "ID:", user.id);

    // Check if they already have a profile
    const existingProfile = await ScoutProfileModel.findOne({ userId: user.id });
    
    if (existingProfile) {
      if (existingProfile.role === "leader") {
        console.log("User already has leader role");
        process.exit(0);
      }
      
      // Update to leader role
      existingProfile.role = "leader";
      await existingProfile.save();
      console.log("Updated user to leader role");
    } else {
      // Create new leader profile
      await ScoutProfileModel.create({
        id: randomUUID(),
        userId: user.id!,
        role: "leader",
      });
      console.log("Created leader profile for user");
    }

    console.log("\n✅ User successfully promoted to leader role!");
    console.log("Email:", email);
    console.log("User ID:", user.id);
    console.log("Role: leader");
    
  } catch (error) {
    console.error("Error promoting user to leader:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

promoteToLeader();