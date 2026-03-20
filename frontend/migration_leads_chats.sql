-- ===================================================
-- StayNest: Listing Chats & Visit Requests Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ===================================================

-- 1. Ensure public.profiles has subscription_plan
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='subscription_plan') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_plan text DEFAULT 'free';
    END IF;
END $$;

-- 2. Listing Chats Table (User <-> Vendor)
CREATE TABLE IF NOT EXISTS public.listing_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_from_vendor boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT listing_chats_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT listing_chats_vendor_profile_fkey FOREIGN KEY (vendor_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_listing_chats_listing ON public.listing_chats(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_chats_user_vendor ON public.listing_chats(user_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_listing_chats_vendor ON public.listing_chats(vendor_id);
CREATE INDEX IF NOT EXISTS idx_listing_chats_created_at ON public.listing_chats(created_at);

-- Enable RLS
ALTER TABLE public.listing_chats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "lc_select_policy" ON public.listing_chats
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = vendor_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "lc_insert_policy" ON public.listing_chats
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = vendor_id
  );

CREATE POLICY "lc_update_policy" ON public.listing_chats
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() = vendor_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Visit Requests Table
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  visit_date date NOT NULL,
  visit_time text NOT NULL,
  message text,
  status text DEFAULT 'pending', -- pending, approved, rejected, completed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT visit_requests_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT visit_requests_vendor_profile_fkey FOREIGN KEY (vendor_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_requests_vendor ON public.visit_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_user ON public.visit_requests(user_id);

-- Enable RLS
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "vr_select_policy" ON public.visit_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = vendor_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vr_insert_policy" ON public.visit_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = vendor_id
  );

CREATE POLICY "vr_update_policy" ON public.visit_requests
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() = vendor_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_requests;

SELECT 'Listing Chats and Visit Requests migration applied successfully!' as result;
