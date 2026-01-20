-- UPGRADE BRANDS TABLE FOR GUIDE
-- Run this in Supabase SQL Editor

-- 1. Add Marketing Columns
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS marketing_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Generate initial slugs for existing brands
UPDATE brands 
SET slug = LOWER(regexp_replace(name, '[\s]+', '-', 'g')) 
WHERE slug IS NULL;

-- 3. Ensure Public Read Access (for the landing page)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Brands" ON brands;

CREATE POLICY "Public Read Brands" ON brands
  FOR SELECT TO anon, authenticated
  USING (true);
