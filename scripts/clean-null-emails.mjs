import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function cleanNullEmails() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all users with null email
    const nullEmailUsers = await usersCollection.find({ email: null }).toArray();
    
    console.log(`\nFound ${nullEmailUsers.length} users with null email.`);
    
    if (nullEmailUsers.length > 0) {
      console.log("Converting null email to undefined (deleting the field)...");
      
      for (const user of nullEmailUsers) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $unset: { email: "" } }
        );
        console.log(`✅ Updated user ${user.id}: removed null email field`);
      }
      
      console.log(`\n✅ Successfully updated ${nullEmailUsers.length} users`);
    } else {
      console.log("No users with null email found.");
    }

    // Verify the fix
    const remainingNullEmails = await usersCollection.find({ email: null }).toArray();
    console.log(`\nRemaining users with null email: ${remainingNullEmails.length}`);

  } catch (error) {
    console.error("Error cleaning null emails:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

cleanNullEmails();
