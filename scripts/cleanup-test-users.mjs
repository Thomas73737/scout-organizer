import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function cleanupTestUsers() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Delete test users
    const result = await usersCollection.deleteMany({ 
      phone: { $in: ["5555555555555", "6666666666666"] } 
    });
    
    console.log(`✅ Deleted ${result.deletedCount} test users`);

  } catch (error) {
    console.error("Error cleaning up test users:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

cleanupTestUsers();
