import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import mongoose from "mongoose";
import { CalendarEventModel } from "@workspace/db";
import { randomUUID } from "crypto";

const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

const events = [
  { title: "A فرقة اجتماعات", date: "15/6 - 22/6 - 6/7 - 13/7", time: "Monday 5:30PM-9:00PM", place: "المرص الجديدة البطريركية الفرير (الكنيسة)" },
  { title: "A طليعة اجتماعات", date: "14/6 - 21/6 -5/7 - 12/7 - 19/7", time: "Sunday 7:00PM-9:00PM", place: "الكنيسة خارج اجتماع (الكنيسة)" },
  { title: "A فرقة اجتماع", date: "2/7", time: "Thursday 8:00AM-12:00AM", place: "عراب" },
  { title: "كفاءة شارات", date: "19-20/6", time: "Friday & Saturday 3:00PM-6:00PM", place: "" },
  { title: "عليا طلائع معسكر", date: "26-27/6", time: "", place: "" },
  { title: "Big Wow A", date: "11/7", time: "", place: "نوبيع" },
  { title: "A فرقة معسكر", date: "31/7 - 3/8", time: "", place: "شارة كل حسب عل" },
  { title: "هوايات شارات", date: "7/8 - 21/8", time: "", place: "" },
  { title: "الأول كشاف معسكر والثاب", date: "14-15/8", time: "", place: "عراب" },
  { title: "A كشف لقاء", date: "22/8", time: "", place: "النطرون وادي" },
  { title: "الفريق فوج", date: "28-30/8", time: "", place: "" },
];

async function seed() {
  try {
    await mongoose.connect(databaseUrl);
    console.log("Connected to MongoDB");

    const existing = await CalendarEventModel.countDocuments();
    if (existing > 0) {
      console.log(`Calendar already has ${existing} events. Skipping seed.`);
      await mongoose.disconnect();
      return;
    }

    for (const event of events) {
      await CalendarEventModel.create({
        id: randomUUID(),
        title: event.title,
        date: event.date,
        time: event.time,
        place: event.place,
        notes: "",
        createdByUserId: "seed",
      });
      console.log(`Created event: ${event.title}`);
    }

    console.log("Calendar seeded successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
