import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function checkUserStructure() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Get all users and show their structure
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`\nTotal users: ${allUsers.length}`);
    
    for (const user of allUsers) {
      console.log(`\nUser ID: ${user.id}`);
      console.log(`  Email field exists: ${'email' in user}`);
      console.log(`  Email value: ${user.email}`);
      console.log(`  Email type: ${typeof user.email}`);
      console.log(`  Full document:`, JSON.stringify(user, null, 2));
    }

  } catch (error) {
    console.error("Error checking user structure:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkUserStructure();
