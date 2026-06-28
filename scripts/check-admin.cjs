const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

// Simple MongoDB connection check
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function checkAdmin() {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB");

    // Define schemas inline
    const userSchema = new mongoose.Schema({
      id: { type: String, unique: true, sparse: true },
      email: { type: String, unique: true, sparse: true },
      firstName: String,
      lastName: String,
      phone: String,
      team: String,
      profileImageUrl: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const scoutProfileSchema = new mongoose.Schema({
      id: { type: String, unique: true, sparse: true },
      userId: { type: String, required: true, unique: true },
      role: { type: String, default: "scout", enum: ["scout", "leader"] },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const UserModel = mongoose.model("User", userSchema);
    const ScoutProfileModel = mongoose.model("ScoutProfile", scoutProfileSchema);

    // Check for admin user (Thomas Samir with phone 1234567891011)
    const adminUser = await UserModel.findOne({ phone: "1234567891011" });
    
    if (adminUser) {
      console.log("Found admin user:");
      console.log("  ID:", adminUser.id);
      console.log("  Name:", adminUser.firstName, adminUser.lastName);
      console.log("  Phone:", adminUser.phone);
      console.log("  Email:", adminUser.email);
      
      // Check for profile
      const profile = await ScoutProfileModel.findOne({ userId: adminUser.id });
      
      if (profile) {
        console.log("Found profile:");
        console.log("  Profile ID:", profile.id);
        console.log("  Role:", profile.role);
        
        if (profile.role !== "leader") {
          console.log("\n⚠️  Admin user does not have leader role!");
          console.log("Updating to leader role...");
          profile.role = "leader";
          await profile.save();
          console.log("✅ Updated to leader role");
        } else {
          console.log("✅ Admin user already has leader role");
        }
      } else {
        console.log("\n⚠️  Admin user has no profile!");
        console.log("Creating leader profile...");
        await ScoutProfileModel.create({
          id: randomUUID(),
          userId: adminUser.id,
          role: "leader",
        });
        console.log("✅ Created leader profile");
      }
    } else {
      console.log("❌ Admin user not found in database");
      console.log("The admin user (Thomas Samir, phone: 1234567891011) needs to be created first");
    }

    // Check all users and profiles
    console.log("\n--- All Users ---");
    const allUsers = await UserModel.find({});
    console.log("Total users:", allUsers.length);
    for (const user of allUsers) {
      const profile = await ScoutProfileModel.findOne({ userId: user.id });
      console.log(`- ${user.firstName} ${user.lastName} (${user.phone}) - Role: ${profile?.role || 'no profile'}`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();