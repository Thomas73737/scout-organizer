-- Scout Organizer - Storage buckets
-- Run this in the Supabase SQL Editor or via `supabase db push`
--
-- Uploads previously lived on the API server's local filesystem, which works on
-- Railway/Replit but not on serverless hosts like Vercel (read-only and
-- ephemeral between invocations). These buckets are the durable replacement.
--
-- The API talks to Storage with the service-role key, which bypasses RLS, so no
-- permissive storage policies are created here: every read and write is
-- authorised by the application. Both buckets stay private and objects are
-- streamed through the API's authenticated endpoints.

-- ============================================
-- PRIVATE BUCKET: user uploads and attachments
-- ============================================
-- Serves /api/storage/objects/* (post attachments, profile images).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', false, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- ============================================
-- PUBLIC BUCKET: assets served without auth
-- ============================================
-- Serves /api/storage/public-objects/*.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('public', 'public', false, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
