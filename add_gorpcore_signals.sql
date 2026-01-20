
-- Add new generic technical gear signals to Gorpcore
WITH s AS (SELECT id FROM style_taxonomy WHERE style_name = 'gorpcore')
INSERT INTO style_signals (style_id, signal_type, signal_value, weight)
SELECT id, 'attribute', 'puffer', 0.3 FROM s UNION ALL
SELECT id, 'attribute', 'down vest', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'down jacket', 0.4 FROM s UNION ALL
SELECT id, 'attribute', 'rain jacket', 0.4 FROM s;
