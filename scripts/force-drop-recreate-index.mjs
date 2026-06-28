import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function forceDropRecreateIndex() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check existing indexes
    console.log("\nCurrent indexes on users collection:");
    const indexes = await usersCollection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Force drop ALL email-related indexes
    console.log("\nDropping all email-related indexes...");
    for (const index of indexes) {
      if (index.key?.email === 1) {
        try {
          await usersCollection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`Could not drop index ${index.name}: ${error.message}`);
        }
      }
    }

    // Recreate the index with sparse option
    console.log("\nCreating sparse unique index on email field...");
    await usersCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        name: "email_1",
        background: true
      }
    );
    console.log("Sparse email index created successfully");

    // Verify the fix
    console.log("\nFinal indexes on users collection:");
    const finalIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log("\n✅ Email index force recreated successfully!");

  } catch (error) {
    console.error("Error fixing email index:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

forceDropRecreateIndex();
