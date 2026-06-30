import mongoose from "mongoose";
import { randomUUID } from "crypto";

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
  const url = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
  await mongoose.connect(url);
  
  const existing = await mongoose.connection.db.collection("calendarevents").countDocuments();
  if (existing > 0) {
    console.log(`Calendar already has ${existing} events. Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  for (const event of events) {
    await mongoose.connection.db.collection("calendarevents").insertOne({
      id: randomUUID(),
      title: event.title,
      date: event.date,
      time: event.time,
      place: event.place,
      notes: "",
      createdByUserId: "seed",
      createdAt: new Date(),
    });
    console.log(`Created: ${event.title}`);
  }
  
  console.log("Calendar seeded successfully!");
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
