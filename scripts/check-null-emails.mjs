import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function checkNullEmails() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check for users with null email
    const nullEmailUsers = await usersCollection.find({ email: null }).toArray();
    
    console.log(`\nFound ${nullEmailUsers.length} users with null email:`);
    nullEmailUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${user.status}`);
    });

    if (nullEmailUsers.length > 1) {
      console.log("\n⚠️  Multiple users with null email found!");
      console.log("This is the likely cause of the duplicate key error.");
      console.log("The sparse index allows multiple null values, but you may need to check if this is intentional.");
    } else if (nullEmailUsers.length === 1) {
      console.log("\n✅ Only one user with null email found. This should be fine with the sparse index.");
    } else {
      console.log("\n✅ No users with null email found.");
    }

  } catch (error) {
    console.error("Error checking null emails:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkNullEmails();
