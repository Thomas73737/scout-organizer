-- Scout Organizer - Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor or via `supabase db push`

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  phone TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL CHECK (section IN ('سنافر', 'اشبال', 'زهرات', 'كشافة', 'مرشدات')),
  team TEXT CHECK (team IN ('A', 'B')),
  "profileImageUrl" TEXT,
  "nationalId" TEXT,
  "whatsappNumber" TEXT,
  "parentsWhatsappNumber" TEXT,
  "homeAddress" TEXT,
  patrol TEXT CHECK (patrol IN ('صقر', 'فهد', 'ثعلب', 'ذئب', 'نمر', 'نسر', 'أسد', 'غراب', 'بلبل', 'ديك', 'خفاش', 'غزال')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'banned')),
  "mainBadge" TEXT,
  "proficiencyBadges" JSONB DEFAULT '[]'::jsonb,
  "hobbyBadges" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);

-- ============================================
-- SCOUT PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS scout_profiles (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'scout' CHECK (role IN ('scout', 'cp', 'cp_of_cps', 'leader', 'developer')),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACCESS REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  phone TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('سنافر', 'اشبال', 'زهرات', 'كشافة', 'مرشدات')),
  team TEXT CHECK (team IN ('A', 'B')),
  "isNewScout" BOOLEAN NOT NULL,
  "whatsappNumber" TEXT,
  "parentsWhatsappNumber" TEXT,
  "homeAddress" TEXT,
  "nationalId" TEXT,
  "photoUrl" TEXT,
  "parentNationalIdPhotoUrl" TEXT,
  patrol TEXT CHECK (patrol IN ('صقر', 'فهد', 'ثعلب', 'ذئب', 'نمر', 'نسر', 'أسد', 'غراب', 'بلبل', 'ديك', 'خفاش', 'غزال')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ATTENDANCE SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "sessionDate" TIMESTAMPTZ NOT NULL,
  notes TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  excuse BOOLEAN DEFAULT false,
  "hasGear" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records ("sessionId");

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ANNOUNCEMENT REPLIES
-- ============================================
CREATE TABLE IF NOT EXISTS announcement_replies (
  id TEXT PRIMARY KEY,
  "announcementId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_replies_announcement ON announcement_replies ("announcementId");

-- ============================================
-- POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  "fileUrl" TEXT,
  "fileName" TEXT,
  "fileType" TEXT,
  "authorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'post', 'message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "relatedId" TEXT NOT NULL,
  "authorName" TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications ("userId", "isRead");

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT false,
  "isEdited" BOOLEAN DEFAULT false,
  "isDeleted" BOOLEAN DEFAULT false,
  "replyToId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver ON chat_messages ("senderId", "receiverId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_read ON chat_messages ("receiverId", "isRead");

-- ============================================
-- POINT TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  "awardedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions ("userId", "createdAt" DESC);

-- ============================================
-- CALENDAR EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  place TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PUSH SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  "keyP256dh" TEXT NOT NULL,
  "keyAuth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  UNIQUE ("userId", endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions ("userId");
