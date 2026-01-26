-- Migration: Add Uniqlo Style Code Patterns
-- Description: Adds Uniqlo brand and its numeric 6-digit style code pattern (e.g., 426578).

-- 1. Ensure Uniqlo exists in brands table
-- FIXED: Use 'slug' as the conflict target, as 'normalized_name' may not be unique.
INSERT INTO brands (name, slug, normalized_name, confidence_tier)
VALUES ('Uniqlo', 'uniqlo', 'uniqlo', 1)
ON CONFLICT (slug) DO NOTHING;

-- 2. Get the Brand ID
DO $$
DECLARE
    uniqlo_id UUID;
BEGIN
    SELECT id INTO uniqlo_id FROM brands WHERE slug = 'uniqlo';

    -- 3. Insert the 6-digit pattern (The standard Item Code)
    -- Uniqlo codes are purely numeric, 6 digits.
    -- Example: 426578
    INSERT INTO style_code_patterns (
        brand_id,
        regex_pattern,
        min_length,
        max_length,
        allowed_charset,
        requires_context,
        confidence_weight,
        is_active
    ) VALUES (
        uniqlo_id,
        '^\d{6}$',  -- Matches exactly 6 digits
        6,
        6,
        'numeric',
        false,
        0.95,       -- High confidence for strict 6-digit match on Uniqlo items
        true
    );

    -- 4. Insert the 9-digit combined pattern (Season + Item Code) just in case
    -- Example: 429426578 (Derived from 429-426578)
    -- We lower the confidence slightly or keep it high if this is common.
    -- However, we prefer the 6-digit.
    -- For now, we will strictly support the 6-digit extraction which is cleaner.

END $$;
