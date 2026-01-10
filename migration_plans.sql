-- Migration: Standardize Plan Tiers to 'trial' and 'annual'

-- 1. Update existing 'free' or null plans to 'trial'
UPDATE profiles 
SET plan_tier = 'trial' 
WHERE plan_tier = 'free' OR plan_tier IS NULL;

-- 2. Update existing 'pro' or 'starter' plans to 'annual'
-- Note: Assuming 'starter' was an old paid tier we want to upgrade/migrate to annual, 
-- or you can map it to 'trial' if you prefer. I will map 'pro' to 'annual'.
UPDATE profiles 
SET plan_tier = 'annual' 
WHERE plan_tier = 'pro';

-- 3. (Optional) Check for any stragglers
-- SELECT * FROM profiles WHERE plan_tier NOT IN ('trial', 'annual');

-- 4. Add a check constraint to ensure future integrity (Optional but recommended)
-- ALTER TABLE profiles ADD CONSTRAINT check_plan_tier CHECK (plan_tier IN ('trial', 'annual'));
