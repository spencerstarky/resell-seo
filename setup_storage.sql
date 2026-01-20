-- Create a public bucket for Brand Assets (Logos, BOLO images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public READ access (so users can see images)
DROP POLICY IF EXISTS "Public Access Brand Assets" ON storage.objects;
CREATE POLICY "Public Access Brand Assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'brand_assets' );

-- Allow Admin INSERT/UPDATE access (so you can upload)
-- We rely on the app's admin check, but strictly we allow authenticated users to upload to this bucket
DROP POLICY IF EXISTS "Admin Upload Brand Assets" ON storage.objects;
CREATE POLICY "Admin Upload Brand Assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'brand_assets' );

DROP POLICY IF EXISTS "Admin Update Brand Assets" ON storage.objects;
CREATE POLICY "Admin Update Brand Assets"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'brand_assets' );

DROP POLICY IF EXISTS "Admin Delete Brand Assets" ON storage.objects;
CREATE POLICY "Admin Delete Brand Assets"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'brand_assets' );
