-- Add "Hunting" Style Logic
-- Goal: Ensure Kuiu, Sitka, and other outdoor brands trigger "Hunting" keyword

-- 1. Create the Style
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('hunting', 'Hunting', ARRAY['Coats & Jackets', 'Pants', 'Vests', 'Shirts', 'Gloves', 'Hats'], 0.8)
ON CONFLICT (style_name) DO NOTHING;

-- 2. Add Signals (Brand Names = Instant Trigger)
WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'hunting')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'kuiu', 1.0 FROM s UNION ALL
SELECT id, 'text', 'sitka', 1.0 FROM s UNION ALL
SELECT id, 'text', 'first lite', 1.0 FROM s UNION ALL
SELECT id, 'text', 'kryptek', 1.0 FROM s UNION ALL
SELECT id, 'attribute', 'real tree', 0.8 FROM s UNION ALL
SELECT id, 'attribute', 'mossy oak', 0.8 FROM s UNION ALL
SELECT id, 'text', 'camo', 0.4 FROM s; -- Camo alone isn't enough (could be fashion), but helps
