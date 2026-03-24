-- Add rejection_reason to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
