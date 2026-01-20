-- STRICT ADMIN SECURITY
-- Only 'resellseo@gmail.com' can manage brands/patterns.

-- 1. Drop the previous "loose" policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON brands;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON brands;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON brands;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON style_code_patterns;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON style_code_patterns;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON style_code_patterns;

-- 2. Drop the STRICT policies if they already exist (to allow re-running this script)
DROP POLICY IF EXISTS "Admin insert brands" ON brands;
DROP POLICY IF EXISTS "Admin update brands" ON brands;
DROP POLICY IF EXISTS "Admin delete brands" ON brands;

DROP POLICY IF EXISTS "Admin insert patterns" ON style_code_patterns;
DROP POLICY IF EXISTS "Admin update patterns" ON style_code_patterns;
DROP POLICY IF EXISTS "Admin delete patterns" ON style_code_patterns;

-- 3. Create Strict Policies for BRANDS
CREATE POLICY "Admin insert brands" ON brands 
FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

CREATE POLICY "Admin update brands" ON brands 
FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

CREATE POLICY "Admin delete brands" ON brands 
FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

-- 4. Create Strict Policies for PATTERNS
CREATE POLICY "Admin insert patterns" ON style_code_patterns 
FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

CREATE POLICY "Admin update patterns" ON style_code_patterns 
FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

CREATE POLICY "Admin delete patterns" ON style_code_patterns 
FOR DELETE TO authenticated 
USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com');
