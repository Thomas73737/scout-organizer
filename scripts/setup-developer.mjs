import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function setupDeveloper() {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Clear all collections
    console.log("\n=== CLEARING DATABASE ===");
    
    const collections = [
      "users",
      "scoutprofiles", 
      "posts",
      "announcements",
      "attendancesessions",
      "attendancerecords",
    ];

    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`✅ Cleared ${collectionName}: ${result.deletedCount} documents`);
    }

    // Create developer account
    console.log("\n=== CREATING DEVELOPER ACCOUNT ===");
    
    const developerUserId = randomUUID();
    const developerUser = await db.collection("users").insertOne({
      id: developerUserId,
      firstName: "sofsafaSVS",
      lastName: "Developer",
      email: "developer@scout.org",
      password: "Youssef@2008", // In production, this should be hashed
      phone: "0000000000", // Temporary phone number
      section: "كشافة", // Default section
      team: "A", // Default team
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Created developer user:", developerUserId, "developer@scout.org");

    // Create developer profile with developer role
    const developerProfile = await db.collection("scoutprofiles").insertOne({
      id: randomUUID(),
      userId: developerUserId,
      role: "developer",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Created developer profile with role: developer");

    console.log("\n=== SETUP COMPLETE ===");
    console.log("Developer account credentials:");
    console.log("Name: sofsafaSVS");
    console.log("Email: developer@scout.org");
    console.log("Password: Youssef@2008");
    console.log("Role: developer");
    console.log("\nYou can now login with these credentials.");

  } catch (error) {
    console.error("Error setting up developer account:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\nDisconnected from MongoDB");
    }
  }
}

setupDeveloper();