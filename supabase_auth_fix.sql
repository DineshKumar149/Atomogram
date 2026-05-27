-- ============================================================
-- ATOME - BYPASS EMAIL CONFIRMATION FIX
-- Copy ALL of this → Paste in Supabase SQL Editor → Click RUN
-- ============================================================

-- Create a function to automatically confirm users when they sign up
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email_confirmed_at to the current timestamp to bypass email confirmation
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires BEFORE an insert on auth.users
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- Manually confirm any existing users that are not yet confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- ============================================================
-- DONE! All users will now be automatically confirmed.
-- ============================================================
