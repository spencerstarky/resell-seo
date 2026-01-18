-- Style Code Intelligence Engine Tables

-- 1. Brands
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  normalized_name text NOT NULL,
  confidence_tier int DEFAULT 3, -- 1=Verified, 2=Community, 3=Untrusted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by normalized name
CREATE INDEX IF NOT EXISTS idx_brands_normalized_name ON brands(normalized_name);

-- 2. Style Code Patterns
CREATE TABLE IF NOT EXISTS style_code_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  regex_pattern text NOT NULL, -- The regex string (e.g., "^[A-Z]{2}\d{4}$")
  min_length int DEFAULT 3,
  max_length int DEFAULT 20,
  allowed_charset text, -- description of allowed chars e.g. "Alphanumeric"
  requires_context boolean DEFAULT false, -- if true, needs to be near keyword
  disallowed_context text[] DEFAULT '{}', -- e.g. ["RN", "CA"]
  example_codes text[] DEFAULT '{}',
  confidence_weight float DEFAULT 1.0,
  is_active boolean DEFAULT true,
  created_by text DEFAULT 'system', -- 'system', 'admin', 'ai', 'community'
  created_at timestamptz DEFAULT now()
);

-- Index for patterns by brand
CREATE INDEX IF NOT EXISTS idx_patterns_brand_id ON style_code_patterns(brand_id);

-- 3. Style Code Detections (Telemetry)
CREATE TABLE IF NOT EXISTS style_code_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id),
  listing_id uuid, -- Optional link to ebay_inventory (if applicable)
  candidate_code text,
  pattern_id uuid REFERENCES style_code_patterns(id),
  confidence_score float,
  source text, -- 'user_field', 'ocr', 'description', 'title'
  accepted boolean, -- true if logic decicded to use it
  user_confirmed boolean DEFAULT false, -- future proofing
  created_at timestamptz DEFAULT now()
);

-- Security Policies (RLS)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_code_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_code_detections ENABLE ROW LEVEL SECURITY;

-- Allow read access to configuration tables for all authenticated users
CREATE POLICY "Enable read access for authenticated users" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for authenticated users" ON style_code_patterns FOR SELECT TO authenticated USING (true);

-- Allow system/service_role to manage everything (Supabase default)

-- Allow users to insert logs (Detections)
CREATE POLICY "Enable insert for authenticated users" ON style_code_detections FOR INSERT TO authenticated WITH CHECK (true);

-- Functions (Optional)
-- Trigger to update updated_at on brands
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
