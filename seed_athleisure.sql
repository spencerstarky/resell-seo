-- ATHLEISURE (Yoga / Gym / Lounge)
INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('athleisure', 'Athleisure', ARRAY['Pants', 'Activewear', 'Tops', 'Shorts', 'Jackets'], 0.7)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'athleisure')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
-- BRANDS
SELECT id, 'text', 'lululemon', 0.6 FROM s UNION ALL
SELECT id, 'text', 'alo yoga', 0.6 FROM s UNION ALL
SELECT id, 'text', 'vuori', 0.6 FROM s UNION ALL
SELECT id, 'text', 'gymshark', 0.5 FROM s UNION ALL
SELECT id, 'text', 'athleta', 0.4 FROM s UNION ALL
SELECT id, 'text', 'beyond yoga', 0.5 FROM s UNION ALL
SELECT id, 'text', 'fabletics', 0.3 FROM s UNION ALL
SELECT id, 'text', 'spiritual gangster', 0.4 FROM s UNION ALL
-- ATTRIBUTES
SELECT id, 'attribute', 'leggings', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'joggers', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'yoga', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'high waisted', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'align', 0.5 FROM s UNION ALL -- Specific Lululemon model
SELECT id, 'attribute', 'scuba', 0.4 FROM s UNION ALL -- Specific Lululemon model
SELECT id, 'attribute', 'define', 0.4 FROM s UNION ALL -- Specific Lululemon model
SELECT id, 'attribute', 'seamless', 0.2 FROM s UNION ALL
SELECT id, 'attribute', 'compression', 0.2 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;
