import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  UserModel,
  ScoutProfileModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  PostModel,
  AnnouncementModel,
} from "../lib/db/src";

dotenv.config();

async function cleanupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set in .env file");
    process.exit(1);
  }

  try {
    console.log("Connecting to database...");
    await mongoose.connect(dbUrl);
    console.log("Connected to database");

    // Find all developer accounts
    const developerProfiles = await ScoutProfileModel.find({ role: "developer" }).lean();
    const developerUserIds = developerProfiles.map(p => p.userId);
    
    console.log(`Found ${developerUserIds.length} developer account(s) to preserve`);
    developerProfiles.forEach(p => console.log(`  - Keeping: ${p.userId}`));

    // Delete attendance records
    console.log("Deleting attendance records...");
    const attendanceRecordsDeleted = await AttendanceRecordModel.deleteMany({});
    console.log(`  Deleted ${attendanceRecordsDeleted.deletedCount} attendance records`);

    // Delete attendance sessions
    console.log("Deleting attendance sessions...");
    const attendanceSessionsDeleted = await AttendanceSessionModel.deleteMany({});
    console.log(`  Deleted ${attendanceSessionsDeleted.deletedCount} attendance sessions`);

    // Delete posts
    console.log("Deleting posts...");
    const postsDeleted = await PostModel.deleteMany({});
    console.log(`  Deleted ${postsDeleted.deletedCount} posts`);

    // Delete announcements
    console.log("Deleting announcements...");
    const announcementsDeleted = await AnnouncementModel.deleteMany({});
    console.log(`  Deleted ${announcementsDeleted.deletedCount} announcements`);

    // Delete access requests (if they exist in a separate collection)
    console.log("Checking for access requests...");
    try {
      const AccessRequestModel = mongoose.model("AccessRequest");
      const accessRequestsDeleted = await AccessRequestModel.deleteMany({});
      console.log(`  Deleted ${accessRequestsDeleted.deletedCount} access requests`);
    } catch (error) {
      console.log("  No access requests collection found (skipping)");
    }

    // Delete non-developer scout profiles
    console.log("Deleting non-developer scout profiles...");
    const profilesDeleted = await ScoutProfileModel.deleteMany({ 
      role: { $ne: "developer" } 
    });
    console.log(`  Deleted ${profilesDeleted.deletedCount} scout profiles`);

    // Delete non-developer users
    console.log("Deleting non-developer users...");
    const usersDeleted = await UserModel.deleteMany({ 
      id: { $nin: developerUserIds } 
    });
    console.log(`  Deleted ${usersDeleted.deletedCount} users`);

    console.log("\n✅ Database cleanup completed successfully!");
    console.log(`\nPreserved ${developerUserIds.length} developer account(s):`);
    for (const userId of developerUserIds) {
      const user = await UserModel.findOne({ id: userId });
      console.log(`  - ${user?.firstName} ${user?.lasbtName} (${user?.email})`);
    }

  } catch (error) {
    console.error("Error during database cleanup:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from database");
  }
}

cleanupDatabase();  