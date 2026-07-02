import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  senderId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

chatMessageSchema.index({ senderId: 1, receiverId: 1 });
chatMessageSchema.index({ receiverId: 1, isRead: 1 });

export const ChatMessageModel = mongoose.model("ChatMessage", chatMessageSchema);

export type ChatMessage = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
};

export type InsertChatMessage = Omit<ChatMessage, "_id" | "createdAt">;
