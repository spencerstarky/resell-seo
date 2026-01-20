-- 1. Remove duplicates (keep highest weight)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY style_id, LOWER(signal_value) 
               ORDER BY weight DESC, created_at DESC
           ) as rn
    FROM style_signals
)
DELETE FROM style_signals
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Normalize all signals to lowercase (prevent 'Puffer' vs 'puffer')
UPDATE style_signals SET signal_value = LOWER(signal_value);

-- 3. Add Unique Constraint
ALTER TABLE style_signals
ADD CONSTRAINT style_signals_unique_value_per_style 
UNIQUE (style_id, signal_value);
