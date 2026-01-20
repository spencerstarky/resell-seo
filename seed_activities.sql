-- SEED DATA: Activity Styles (Golf, Hunting, Fishing)

-- 1. GOLF
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('golf', 'Golf', ARRAY['Shirts', 'Pants', 'Shorts', 'Outerwear', 'Vests', 'Shoes'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'golf')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'callaway', 0.4 FROM s UNION ALL
SELECT id, 'text', 'titleist', 0.4 FROM s UNION ALL
SELECT id, 'text', 'taylormade', 0.4 FROM s UNION ALL
SELECT id, 'text', 'footjoy', 0.5 FROM s UNION ALL
SELECT id, 'text', 'bad birdie', 0.5 FROM s UNION ALL
SELECT id, 'text', 'peter millar', 0.4 FROM s UNION ALL
SELECT id, 'text', 'pxg', 0.4 FROM s UNION ALL
SELECT id, 'text', 'travis mathew', 0.4 FROM s UNION ALL
SELECT id, 'text', 'nike golf', 0.4 FROM s UNION ALL -- "Nike Golf" is stronger than just "Nike"
SELECT id, 'text', 'adidas golf', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'polo', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'quarter zip', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'pique', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'performance', 0.1 FROM s UNION ALL
SELECT id, 'attribute', 'dri-fit', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'moisture wicking', 0.2 FROM s;

-- 2. HUNTING
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('hunting', 'Hunting', ARRAY['Coats & Jackets', 'Pants', 'Vests', 'Boots', 'Accessories'], 0.75)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'hunting')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'sitka', 0.6 FROM s UNION ALL
SELECT id, 'text', 'kuiu', 0.6 FROM s UNION ALL
SELECT id, 'text', 'first lite', 0.6 FROM s UNION ALL
SELECT id, 'text', 'mossy oak', 0.5 FROM s UNION ALL
SELECT id, 'text', 'realtree', 0.5 FROM s UNION ALL
SELECT id, 'text', 'cabela''s', 0.3 FROM s UNION ALL
SELECT id, 'text', 'redhead', 0.3 FROM s UNION ALL
SELECT id, 'text', 'drake waterfowl', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'camo', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'camouflage', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'blaze orange', 0.6 FROM s UNION ALL
SELECT id, 'attribute', 'scent control', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'gore-tex', 0.2 FROM s; -- Shared with Gorpcore, but relevant

-- 3. FISHING
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('fishing', 'Fishing', ARRAY['Shirts', 'Shorts', 'Hats', 'Outerwear', 'Vests'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'fishing')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'huk', 0.5 FROM s UNION ALL
SELECT id, 'text', 'pelagic', 0.5 FROM s UNION ALL
SELECT id, 'text', 'aftco', 0.5 FROM s UNION ALL
SELECT id, 'text', 'simms', 0.5 FROM s UNION ALL
SELECT id, 'text', 'columbia pfg', 0.5 FROM s UNION ALL
SELECT id, 'text', 'magellan', 0.3 FROM s UNION ALL
SELECT id, 'text', 'salt life', 0.4 FROM s UNION ALL
SELECT id, 'text', 'guy harvey', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'vented', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'mesh back', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'upf', 0.2 FROM s UNION ALL -- Sun protection
SELECT id, 'attribute', 'waders', 0.6 FROM s UNION ALL
SELECT id, 'attribute', 'fishing shirt', 0.5 FROM s;
