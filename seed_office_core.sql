-- OFFICE CORE / OLD MONEY STYLE PACK
-- Captures High-Value Professional & "Quiet Luxury" Trends

INSERT INTO style_taxonomy (style_name, display_name, category_whitelist, confidence_floor)
VALUES ('office_core', 'Office Core', ARRAY['Blazers', 'Suits', 'Pants', 'Skirts', 'Dresses', 'Shirts', 'Sweaters', 'Coats'], 0.65)
ON CONFLICT (style_name) DO NOTHING;

WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'office_core')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'text', 'polo ralph lauren', 0.4 FROM s UNION ALL
SELECT id, 'text', 'brooks brothers', 0.6 FROM s UNION ALL
SELECT id, 'text', 'theory', 0.5 FROM s UNION ALL
SELECT id, 'text', 'vince', 0.5 FROM s UNION ALL
SELECT id, 'text', 'banana republic', 0.3 FROM s UNION ALL
SELECT id, 'text', 'j crew', 0.3 FROM s UNION ALL
SELECT id, 'text', 'hugo boss', 0.5 FROM s UNION ALL
SELECT id, 'text', 'armani', 0.5 FROM s UNION ALL
SELECT id, 'text', 'burberry', 0.6 FROM s UNION ALL
SELECT id, 'text', 'brunello cucinelli', 0.9 FROM s UNION ALL -- The King of Quiet Luxury
SELECT id, 'text', 'lorc piana', 0.9 FROM s UNION ALL
SELECT id, 'text', 'peter millar', 0.5 FROM s UNION ALL
SELECT id, 'text', 'eileen fisher', 0.4 FROM s UNION ALL

-- ATTRIBUTES
SELECT id, 'attribute', 'silk', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'linen', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'cashmere', 0.5 FROM s UNION ALL 
SELECT id, 'attribute', 'wool', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'merino', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'structured', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'pleated', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'tweed', 0.5 FROM s UNION ALL

-- HIGH VALUE KEYWORDS TO INJECT
SELECT id, 'attribute', 'old money', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'quiet luxury', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'minimalist', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'business casual', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'career', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'office', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'academia', 0.3 FROM s
ON CONFLICT (style_id, signal_value) DO NOTHING;
