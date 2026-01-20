-- UPGRADE REMAINING STYLES (Western, Preppy, Y2K)

-- 1. WESTERN
WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'western')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
-- Brands
SELECT id, 'text', 'lucchese', 0.6 FROM s UNION ALL
SELECT id, 'text', 'tecovas', 0.5 FROM s UNION ALL
SELECT id, 'text', 'justin boots', 0.4 FROM s UNION ALL
SELECT id, 'text', 'dan post', 0.4 FROM s UNION ALL
SELECT id, 'text', 'roper', 0.3 FROM s UNION ALL
SELECT id, 'text', 'panhandle slim', 0.5 FROM s UNION ALL
SELECT id, 'text', 'rocky mountain', 0.5 FROM s UNION ALL
-- Attributes
SELECT id, 'attribute', 'sawtooth', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'yoke', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'snap button', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'embossed', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'concho', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'sherpa lined', 0.3 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;

-- 2. PREPPY
WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'preppy')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
-- Brands
SELECT id, 'text', 'vineyard vines', 0.5 FROM s UNION ALL
SELECT id, 'text', 'brooks brothers', 0.5 FROM s UNION ALL
SELECT id, 'text', 'j.crew', 0.3 FROM s UNION ALL
SELECT id, 'text', 'lilly pulitzer', 0.6 FROM s UNION ALL
SELECT id, 'text', 'lacoste', 0.4 FROM s UNION ALL
SELECT id, 'text', 'barbour', 0.4 FROM s UNION ALL
SELECT id, 'text', 'rowing blazers', 0.5 FROM s UNION ALL
-- Attributes
SELECT id, 'attribute', 'rugby', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'seersucker', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'tweed', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'critter pant', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'sweater vest', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'pleated', 0.2 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;

-- 3. Y2K
WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'y2k')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
-- Brands
SELECT id, 'text', 'juicy couture', 0.7 FROM s UNION ALL
SELECT id, 'text', 'baby phat', 0.6 FROM s UNION ALL
SELECT id, 'text', 'ed hardy', 0.6 FROM s UNION ALL
SELECT id, 'text', 'von dutch', 0.6 FROM s UNION ALL
SELECT id, 'text', 'true religion', 0.5 FROM s UNION ALL
SELECT id, 'text', 'miss me', 0.5 FROM s UNION ALL
SELECT id, 'text', 'bebe', 0.4 FROM s UNION ALL
-- Attributes
SELECT id, 'attribute', 'velour', 0.5 FROM s UNION ALL
SELECT id, 'attribute', 'tracksuit', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'butterfly', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'metallic', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'mini skirt', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'cargo skirt', 0.4 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;
