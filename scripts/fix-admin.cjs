const mongoose = require('../lib/db/node_modules/mongoose');
const { randomUUID } = require('crypto');

// Comprehensive admin fix script
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function fixAdmin() {
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

    const sessionSchema = new mongoose.Schema({
      sid: { type: String, required: true, unique: true },
      sess: { type: mongoose.Schema.Types.Mixed, required: true },
      expire: { type: Date, required: true },
    });

    const UserModel = mongoose.model("User", userSchema);
    const ScoutProfileModel = mongoose.model("ScoutProfile", scoutProfileSchema);
    const SessionModel = mongoose.model("Session", sessionSchema);

    // Step 1: Ensure admin user exists
    const adminPhone = "1234567891011";
    const adminName = "Thomas Samir";
    
    let adminUser = await UserModel.findOne({ phone: adminPhone });
    
    if (!adminUser) {
      console.log("Creating admin user...");
      adminUser = await UserModel.create({
        id: randomUUID(),
        firstName: "Thomas",
        lastName: "Samir",
        phone: adminPhone,
        team: "4444",
      });
      console.log("✅ Created admin user with ID:", adminUser.id);
    } else {
      console.log("✅ Admin user found with ID:", adminUser.id);
    }

    // Step 2: Ensure admin has leader profile
    let adminProfile = await ScoutProfileModel.findOne({ userId: adminUser.id });
    
    if (!adminProfile) {
      console.log("Creating leader profile for admin...");
      adminProfile = await ScoutProfileModel.create({
        id: randomUUID(),
        userId: adminUser.id,
        role: "leader",
      });
      console.log("✅ Created leader profile");
    } else if (adminProfile.role !== "leader") {
      console.log("Updating admin profile to leader role...");
      adminProfile.role = "leader";
      await adminProfile.save();
      console.log("✅ Updated to leader role");
    } else {
      console.log("✅ Admin already has leader role");
    }

    // Step 3: Check and fix any session issues
    console.log("\nChecking sessions...");
    const sessions = await SessionModel.find({});
    console.log("Total sessions:", sessions.length);
    
    for (const session of sessions) {
      const sessionData = session.sess;
      if (sessionData.user && sessionData.user.id === adminUser.id) {
        console.log("Found admin session:", session.sid);
        console.log("Session expires:", session.expire);
        
        // Check if session is expired
        if (session.expire < new Date()) {
          console.log("⚠️  Session expired, deleting...");
          await SessionModel.deleteOne({ sid: session.sid });
          console.log("✅ Deleted expired session");
        } else {
          console.log("✅ Session is valid");
        }
      }
    }

    // Step 4: Display final status
    console.log("\n=== FINAL ADMIN STATUS ===");
    console.log("User ID:", adminUser.id);
    console.log("Name:", adminUser.firstName, adminUser.lastName);
    console.log("Phone:", adminUser.phone);
    console.log("Profile ID:", adminProfile.id);
    console.log("Role:", adminProfile.role);
    console.log("\n✅ Admin setup complete!");
    console.log("You should now be able to approve access requests.");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdmin();