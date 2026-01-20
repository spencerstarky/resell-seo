-- HIGH IMPACT SEO PACK: Vintage, Streetwear, Workwear, Skater

-- 1. VINTAGE (90s / Retro)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('vintage', 'Vintage', ARRAY['T-Shirts', 'Sweatshirts', 'Jackets', 'Hats', 'Jeans'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'vintage')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'attribute', 'single stitch', 0.8 FROM s UNION ALL
SELECT id, 'attribute', 'made in usa', 0.6 FROM s UNION ALL
SELECT id, 'attribute', 'faded', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'dated', 0.4 FROM s UNION ALL -- e.g. "1994"
SELECT id, 'text', 'liquid blue', 0.7 FROM s UNION ALL
SELECT id, 'text', 'brockum', 0.6 FROM s UNION ALL
SELECT id, 'text', 'giant', 0.6 FROM s UNION ALL
SELECT id, 'text', 'fruit of the loom', 0.2 FROM s UNION ALL -- Only vintage tags trigger usually
SELECT id, 'text', 'hanes beefy', 0.3 FROM s UNION ALL
SELECT id, 'text', 'starter', 0.5 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;

-- 2. WORKWEAR (Carhartt / Dickies Aesthetic)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('workwear', 'Workwear', ARRAY['Coats & Jackets', 'Pants', 'Vests', 'Overalls'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'workwear')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'carhartt', 0.5 FROM s UNION ALL
SELECT id, 'text', 'dickies', 0.5 FROM s UNION ALL
SELECT id, 'text', 'ben davis', 0.6 FROM s UNION ALL
SELECT id, 'text', 'filson', 0.5 FROM s UNION ALL
SELECT id, 'text', 'red wing', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'double knee', 0.7 FROM s UNION ALL -- HUGE keyword
SELECT id, 'attribute', 'canvas', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'duck', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'carpenter', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'distressed', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'chore coat', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'detroit', 0.4 FROM s -- Detroit Jacket
ON CONFLICT (style_id, signal_value) DO NOTHING;

-- 3. STREETWEAR (Hype / Urban)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('streetwear', 'Streetwear', ARRAY['T-Shirts', 'Hoodies', 'Jackets', 'Accessories', 'Sneakers'], 0.75)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'streetwear')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'supreme', 0.8 FROM s UNION ALL
SELECT id, 'text', 'bape', 0.8 FROM s UNION ALL
SELECT id, 'text', 'off-white', 0.7 FROM s UNION ALL
SELECT id, 'text', 'palace', 0.6 FROM s UNION ALL
SELECT id, 'text', 'stussy', 0.5 FROM s UNION ALL
SELECT id, 'text', 'fear of god', 0.5 FROM s UNION ALL
SELECT id, 'text', 'essentials', 0.4 FROM s UNION ALL
SELECT id, 'text', 'kith', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'box logo', 0.7 FROM s UNION ALL -- "Bogo"
SELECT id, 'attribute', 'collab', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'oversized', 0.3 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;

-- 4. SKATER (Core Skate / Grunge)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('skater', 'Skater', ARRAY['Jeans', 'T-Shirts', 'Shoes', 'Hoodies', 'Pants'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'skater')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'vans', 0.5 FROM s UNION ALL
SELECT id, 'text', 'dc shoes', 0.5 FROM s UNION ALL
SELECT id, 'text', 'volcom', 0.5 FROM s UNION ALL
SELECT id, 'text', 'element', 0.5 FROM s UNION ALL
SELECT id, 'text', 'thrasher', 0.6 FROM s UNION ALL
SELECT id, 'text', 'spitfire', 0.5 FROM s UNION ALL
SELECT id, 'text', 'blind', 0.6 FROM s UNION ALL
SELECT id, 'text', 'world industries', 0.6 FROM s UNION ALL
SELECT id, 'text', 'jnco', 0.8 FROM s UNION ALL -- The ultimate skater signal
SELECT id, 'text', 'polar big boy', 0.7 FROM s UNION ALL
SELECT id, 'attribute', 'baggy', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'wide leg', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'loose fit', 0.3 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;
