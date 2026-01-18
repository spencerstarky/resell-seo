-- 1. Style Taxonomy
-- Defines the universe of tracked styles
CREATE TABLE IF NOT EXISTS style_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_name TEXT NOT NULL UNIQUE, -- e.g., "gorpcore"
    display_name TEXT NOT NULL,      -- e.g., "Gorpcore"
    category_whitelist TEXT[],       -- Array of allowed categories (e.g. ['Outerwear', 'Pants'])
    disallowed_categories TEXT[],    -- Array of explicitly blocked categories
    confidence_floor FLOAT DEFAULT 0.75, -- Minimum score to apply
    max_per_title INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Style Signals
-- The weighted clues that point to a style
CREATE TABLE IF NOT EXISTS style_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID REFERENCES style_taxonomy(id) ON DELETE CASCADE,
    signal_type TEXT CHECK (signal_type IN ('visual', 'text', 'attribute')),
    signal_value TEXT NOT NULL,
    weight FLOAT NOT NULL, -- Contribution to confidence score (0.0 to 1.0)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Style Detections
-- Telemetry to track what logic fired and when
CREATE TABLE IF NOT EXISTS style_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID, -- Can be linked to ebay_inventory later if needed, soft link for now
    style_id UUID REFERENCES style_taxonomy(id),
    confidence_score FLOAT NOT NULL,
    signals_fired JSONB, -- Snapshot of which signals triggered: { "zipper": 0.3, "nylon": 0.2 }
    accepted BOOLEAN DEFAULT FALSE,
    user_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE style_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_detections ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin (resellseo@gmail.com) has full control
-- Public/Service Role needs READ access to Taxonomy and Signals to run logic
-- Service Role needs INSERT access to Detections

CREATE POLICY "Admin Full Access Trends" ON style_taxonomy
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'resellseo@gmail.com'))
    WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'resellseo@gmail.com'));

CREATE POLICY "Public Read Trends" ON style_taxonomy
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admin Full Access Signals" ON style_signals
    TO authenticated
    USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'resellseo@gmail.com'))
    WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'resellseo@gmail.com'));

CREATE POLICY "Public Read Signals" ON style_signals
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "System Insert Detections" ON style_detections
    FOR INSERT TO anon, authenticated
    WITH CHECK (true); -- Allow system/users to log detections

-- 4. SEED DATA (MVP Styles)

-- Clear existing to avoid dupes/conflicts during development if re-run
TRUNCATE style_signals CASCADE;
TRUNCATE style_taxonomy CASCADE;

-- Gorpcore
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('gorpcore', 'Gorpcore', ARRAY['Coats & Jackets', 'Pants', 'Vests', 'Camping'], 0.7);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'gorpcore')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'attribute', 'gore-tex', 0.5 FROM s UNION ALL
SELECT id, 'text', 'trail', 0.3 FROM s UNION ALL
SELECT id, 'text', 'technical', 0.3 FROM s UNION ALL
SELECT id, 'text', 'outdoor', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'nylon', 0.2 FROM s UNION ALL
SELECT id, 'text', 'utility', 0.25 FROM s;

-- Western
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('western', 'Western', ARRAY['Shirts', 'Boots', 'Jeans', 'Outerwear'], 0.75);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'western')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'attribute', 'pearl snap', 0.6 FROM s UNION ALL
SELECT id, 'text', 'cowboy', 0.5 FROM s UNION ALL
SELECT id, 'text', 'rodeo', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'fringe', 0.3 FROM s UNION ALL
SELECT id, 'text', 'ranch', 0.25 FROM s;

-- Boho
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('boho', 'Boho', ARRAY['Dresses', 'Skirts', 'Tops', 'Blouses'], 0.7);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'boho')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'peasant', 0.4 FROM s UNION ALL
SELECT id, 'text', 'hippie', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'crochet', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'fringe', 0.2 FROM s UNION ALL
SELECT id, 'text', 'festival', 0.3 FROM s;

-- Preppy
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('preppy', 'Preppy', ARRAY['Sweaters', 'Polos', 'Blazers', 'Skirts'], 0.7);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'preppy')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'attribute', 'argyle', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'cable knit', 0.4 FROM s UNION ALL
SELECT id, 'text', 'ivy league', 0.5 FROM s UNION ALL
SELECT id, 'text', 'country club', 0.4 FROM s;

-- Cottagecore
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('cottagecore', 'Cottagecore', ARRAY['Dresses', 'Skirts', 'Blouses'], 0.8);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'cottagecore')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'prairie', 0.5 FROM s UNION ALL
SELECT id, 'text', 'milkmaid', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'corset', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'puff sleeve', 0.3 FROM s;

-- Y2K (Subset of Vintage often requested)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('y2k', 'Y2K', ARRAY['Tops', 'Jeans', 'Skirts', 'Accessories'], 0.7);

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'y2k')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'rhinestone', 0.4 FROM s UNION ALL
SELECT id, 'text', 'baby tee', 0.5 FROM s UNION ALL
SELECT id, 'text', 'low rise', 0.5 FROM s UNION ALL
SELECT id, 'text', 'cyber', 0.3 FROM s;

