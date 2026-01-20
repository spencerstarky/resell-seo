-- SECURITY HARDENING & FIXES
-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY

-- 1. FIX THE "ROBIN HOOD" VULNERABILITY
-- We MUST drop the old function first because we are changing parameter names/defaults.
DROP FUNCTION IF EXISTS increment_usage(uuid);

-- The previous function accepted a user_id argument, allowing anyone to modify anyone's usage.
-- This version IGNORES the argument and enforces `auth.uid()`.
CREATE OR REPLACE FUNCTION increment_usage(target_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We strictly use auth.uid() to ensure a user can only increment their OWN usage.
  -- SECURITY DEFINER allows this function to bypass RLS to update the profile, 
  -- but we constrain the WHERE clause to the session user.
  UPDATE public.profiles
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = auth.uid();
END;
$$;


-- 2. SECURE THE "GHOST TABLE" (ebay_inventory)
-- Enable RLS (idempotent: safe to run even if already on)
ALTER TABLE IF EXISTS public.ebay_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts/duplicates
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.ebay_inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.ebay_inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.ebay_inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.ebay_inventory;

-- Create strict policies
CREATE POLICY "Users can view their own inventory"
  ON public.ebay_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON public.ebay_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON public.ebay_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON public.ebay_inventory FOR DELETE
  USING (auth.uid() = user_id);


-- 3. ENSURE OPTIMIZATION HISTORY IS PRIVATE
ALTER TABLE IF EXISTS public.optimization_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their history" ON public.optimization_history;
DROP POLICY IF EXISTS "Users can insert history" ON public.optimization_history;

CREATE POLICY "Users can view their history"
  ON public.optimization_history FOR SELECT
  USING (auth.uid() = user_id);

-- System inserts history (via service role usually), but if client does it:
CREATE POLICY "Users can insert history"
  ON public.optimization_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
