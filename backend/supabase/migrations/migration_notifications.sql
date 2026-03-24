-- ===================================================
-- StayNest: Notifications RLS Fix for Targeted Notifications
-- Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ===================================================

-- Add 'type' column to notifications if it doesn't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';

-- Add index for fast user-specific notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_vendor_activity ON public.notifications(user_id, receiver_type);

-- Allow authenticated users to insert notifications for ANY user_id
-- (needed so users can notify vendors on visit booking, and vendors can notify users on status update/chat)
-- First drop existing insert policy if any
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'notifications_insert_policy'
  ) THEN
    DROP POLICY notifications_insert_policy ON public.notifications;
  END IF;
END $$;

-- Allow all authenticated users to insert notifications
CREATE POLICY IF NOT EXISTS "notifications_insert_any" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow users to read their own notifications + broadcasts (existing behavior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'notifications_select_own'
  ) THEN
    CREATE POLICY "notifications_select_own" ON public.notifications
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR is_broadcast = true
      );
  END IF;
END $$;

-- Ensure RLS is enabled on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

SELECT 'Notifications migration applied successfully!' as result;
