-- ===================================================
-- StayNest: Enhanced Messaging System Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ===================================================

-- Add receiver_type and sender_id columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS receiver_type text DEFAULT 'all';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id);

-- Index for fast lookups by receiver_type
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_type ON public.notifications(receiver_type, created_at DESC);

SELECT 'Messaging migration applied successfully!' as result;
