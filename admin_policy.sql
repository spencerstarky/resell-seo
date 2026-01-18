-- Allow Authenticated Users (Admins) to Manage Brands & Patterns
-- In a real production app with multiple users, you'd want a "role = admin" check.
-- For now, we trust authenticated users (you).

CREATE POLICY "Enable insert for authenticated users" ON brands 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON brands 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON brands 
FOR DELETE TO authenticated USING (true);

-- Patterns
CREATE POLICY "Enable insert for authenticated users" ON style_code_patterns 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON style_code_patterns 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON style_code_patterns 
FOR DELETE TO authenticated USING (true);
