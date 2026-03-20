-- Add auth-related fields to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Update RLS policies to allow reading these tokens by the owner (for self-verification)
-- and for the Edge Function with service_role to manage them.

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token ON public.profiles(verification_token);
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON public.profiles(reset_token);

-- Force is_verified to TRUE for Google users (existing and new)
UPDATE public.profiles SET is_verified = TRUE WHERE login_method = 'google';

-- Create a helper function to set is_verified = true for Google signups automatically
CREATE OR REPLACE FUNCTION public.handle_google_verification() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.login_method = 'google' THEN
    NEW.is_verified := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_google_verification ON public.profiles;
CREATE TRIGGER tr_google_verification
BEFORE INSERT OR UPDATE OF login_method ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_google_verification();
