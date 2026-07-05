import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const backupDir = path.join(projectRoot, "db-backup");

async function exportData() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const db = client.db();
    const collections = await db.listCollections().toArray();
    const metadata = {};

    for (const col of collections) {
      const collection = db.collection(col.name);
      const documents = await collection.find({}).toArray();
      const filePath = path.join(backupDir, `${col.name}.json`);

      // Convert ObjectId and Date to serializable format
      const serialized = JSON.stringify(
        documents,
        (key, value) => {
          if (value && typeof value === "object" && value._bsontype === "ObjectId") {
            return value.toString();
          }
          if (value instanceof Date) {
            return value.toISOString();
          }
          // Handle MongoDB ObjectId in _id field
          if (key === "_id" && value && typeof value === "object" && value.id) {
            return value.toString();
          }
          return value;
        },
        2,
      );

      fs.writeFileSync(filePath, serialized);
      metadata[col.name] = { count: documents.length, exportedAt: new Date().toISOString() };
      console.log(`  ✓ ${col.name}: ${documents.length} documents`);
    }

    fs.writeFileSync(
      path.join(backupDir, "_metadata.json"),
      JSON.stringify(metadata, null, 2),
    );

    console.log(`\nExport complete. Files saved to: db-backup/`);
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

exportData();
