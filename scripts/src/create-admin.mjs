import { MongoClient } from 'mongodb';

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function createAdminAccount() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const scoutProfilesCollection = db.collection('scoutprofiles');
    
    // Admin account details
    const adminData = {
      id: crypto.randomUUID(),
      firstName: "Thomas",
      lastName: "Admin",
      phone: "1234567891011",
      team: "4444",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create admin user
    const result = await usersCollection.insertOne(adminData);
    console.log("Created admin user with ID:", adminData.id);
    
    // Create leader profile for admin
    const profileData = {
      id: crypto.randomUUID(),
      userId: adminData.id,
      role: "leader",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await scoutProfilesCollection.insertOne(profileData);
    console.log("Created leader profile for admin");
    
    console.log("\n✅ Admin account created successfully!");
    console.log("Name: Thomas Admin");
    console.log("Phone: 1234567891011");
    console.log("Team: 4444 (secret code)");
    console.log("Role: leader (admin)");
    console.log("\nUse these credentials to log in with admin permissions!");
    
  } catch (error) {
    console.error("Error creating admin account:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdminAccount();