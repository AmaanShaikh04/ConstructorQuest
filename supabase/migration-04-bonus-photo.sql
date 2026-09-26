-- Migration 04: add photo_url to bonus_submissions + create storage bucket

alter table bonus_submissions add column if not exists photo_url text;

-- Create the storage bucket for bonus photos (run once).
-- In Supabase dashboard: Storage → New bucket → name "bonus-photos", Public ON.
-- Or run via the Supabase CLI / API. The SQL editor cannot create buckets directly,
-- so create it manually in the dashboard after running this migration.
