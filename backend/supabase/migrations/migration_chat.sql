-- ===================================================
-- StayNest: Vendor-Admin Chat System Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ===================================================

-- Chat messages table for Vendor <-> Admin communication
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_from_admin boolean DEFAULT false,
  is_read boolean DEFAULT false,
  conversation_id uuid NOT NULL, -- uses vendor's user id to group threads
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chat_messages_sender_profile_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_receiver_profile_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_read ON public.chat_messages(conversation_id, is_read);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in their own conversations OR admins can view all
CREATE POLICY "chat_select_policy" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR auth.uid() = conversation_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: Users can insert messages with their own sender_id
CREATE POLICY "chat_insert_policy" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update their own messages / admins can update any
CREATE POLICY "chat_update_policy" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR auth.uid() = conversation_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable realtime for chat_messages
ALTER publication supabase_realtime ADD TABLE public.chat_messages;

SELECT 'Chat migration applied successfully!' as result;
