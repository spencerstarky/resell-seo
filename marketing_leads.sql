-- Marketing Leads Table
-- Stores emails captured from lead magnets (like the Brand Guide)

CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    source TEXT NOT NULL, -- e.g. 'brand_guide', 'newsletter_footer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate emails per source
    UNIQUE(email, source)
);

-- RLS: Only allowing inserts from public (anon), but reads only by admin
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE to insert (submit form)
CREATE POLICY "Public can insert leads" ON marketing_leads
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only Admin can view leads
CREATE POLICY "Admin can view leads" ON marketing_leads
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'resellseo@gmail.com');
