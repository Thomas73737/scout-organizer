import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function updateAdminCredentials() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Update admin user with new email and password
    const result = await usersCollection.updateOne(
      { phone: "1234567891011" },
      { 
        $set: { 
          email: "thomacyshody@gmail.com",
          password: "thomas500500",
          section: "كشافة",
          team: "A",
          status: "approved",
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount > 0) {
      console.log("✅ Admin user credentials updated successfully");
    } else {
      console.log("❌ Admin user not found, creating new admin user...");
      
      // Create new admin user if not found
      const newUserId = randomUUID();
      
      await usersCollection.insertOne({
        id: newUserId,
        firstName: "Thomas",
        lastName: "Samir",
        email: "thomacyshody@gmail.com",
        password: "thomas500500",
        phone: "1234567891011",
        section: "كشافة",
        team: "A",
        status: "approved",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log("✅ New admin user created successfully");
    }

    // Verify the update
    const adminUser = await usersCollection.findOne({ email: "thomacyshody@gmail.com" });
    console.log("\nUpdated admin user:", JSON.stringify(adminUser, null, 2));

  } catch (error) {
    console.error("Error updating admin credentials:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

updateAdminCredentials();