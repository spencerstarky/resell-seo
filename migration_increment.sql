-- Drop the old function (ignoring error if it doesn't exist)
DROP FUNCTION IF EXISTS increment_usage(uuid);

-- Create the new, correct function
CREATE OR REPLACE FUNCTION increment_usage(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = user_id;
END;
$$;
