import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, default: "" },
  place: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdByUserId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const CalendarEventModel = mongoose.model("CalendarEvent", calendarEventSchema);

export type CalendarEvent = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  notes?: string;
  createdByUserId: string;
  createdAt?: Date;
};

export type InsertCalendarEvent = Omit<CalendarEvent, "_id" | "createdAt">;
