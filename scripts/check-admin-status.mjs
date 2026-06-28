import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function checkAdminStatus() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");
    const profilesCollection = db.collection("scoutprofiles");

    // Check admin user
    const adminUser = await usersCollection.findOne({ phone: "1234567891011" });
    
    if (!adminUser) {
      console.log("❌ Admin user not found in database");
      return;
    }

    console.log("\n=== ADMIN USER STATUS ===");
    console.log("User ID:", adminUser.id);
    console.log("Name:", adminUser.firstName, adminUser.lastName);
    console.log("Phone:", adminUser.phone);
    console.log("Team:", adminUser.team);
    console.log("Status:", adminUser.status);
    console.log("Email:", adminUser.email);
    console.log("Full document:", JSON.stringify(adminUser, null, 2));

    // Check admin profile
    const adminProfile = await profilesCollection.findOne({ userId: adminUser.id });
    
    if (!adminProfile) {
      console.log("\n❌ Admin profile not found - this is the problem!");
      console.log("Creating admin profile...");
      
      await profilesCollection.create({
        id: randomUUID(),
        userId: adminUser.id,
        role: "leader",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Admin profile created");
    } else {
      console.log("\n=== ADMIN PROFILE STATUS ===");
      console.log("Profile ID:", adminProfile.id);
      console.log("User ID:", adminProfile.userId);
      console.log("Role:", adminProfile.role);
      console.log("Full document:", JSON.stringify(adminProfile, null, 2));
    }

    // Check all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log("\n=== ALL USERS IN DATABASE ===");
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.phone} - Status: ${user.status}`);
    });

  } catch (error) {
    console.error("Error checking admin status:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkAdminStatus();
