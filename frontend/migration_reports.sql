-- Add description column for optional text details
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS description text;

-- Add reported_user_id to track abusive users reported by vendors
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_user_id uuid REFERENCES public.profiles(id);

-- Make listing_id nullable since user reports might not relate to a specific listing
ALTER TABLE public.reports ALTER COLUMN listing_id DROP NOT NULL;
