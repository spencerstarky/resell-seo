-- Drop the broken policies that try to read auth.users
DROP POLICY IF EXISTS "Admin Full Access Trends" ON style_taxonomy;
DROP POLICY IF EXISTS "Admin Full Access Signals" ON style_signals;

-- Re-create stricter, safer policies using the JWT (Token) instead of table query

-- 1. Taxonomy (Styles)
CREATE POLICY "Admin Full Access Trends" ON style_taxonomy
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'resellseo@gmail.com');

-- 2. Signals (Keywords/Visuals)
CREATE POLICY "Admin Full Access Signals" ON style_signals
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'resellseo@gmail.com');
