-- Migration: Add Nike Style Code Patterns
-- Description: Adds Nike brand and its specific style code patterns (AR7135, 888888-001).

-- 1. Ensure Nike exists in brands table
INSERT INTO brands (name, slug, normalized_name, confidence_tier)
VALUES ('Nike', 'nike', 'nike', 1)
ON CONFLICT (slug) DO NOTHING;

-- 2. Get the Brand ID
DO $$
DECLARE
    nike_id UUID;
BEGIN
    SELECT id INTO nike_id FROM brands WHERE slug = 'nike';

    -- 3. Insert Patterns

    -- Pattern A: Standard 2-Letter + 4-Digit (e.g. AR7135, DD1234, CZ9999)
    -- This is the modern standard for Nike apparel and some shoes.
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
        nike_id,
        '^[A-Z]{2}\d{4}$',
        6,
        6,
        'alphanumeric',
        false,
        0.95,
        true
    );

    -- Pattern B: Older 6-Digit Numeric (Often followed by -### color code)
    -- We match the first 6 digits only.
    -- Example: 888888 (from 888888-001)
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
        nike_id,
        '^\d{6}$',
        6,
        6,
        'numeric',
        false,
        0.90,
        true
    );

     -- Pattern C: 6-Digit Numeric + Hyphen + 3 Digit Color Code (Full Match)
     -- Sometimes we might want to capture the full string if the user provided it, 
     -- but usually we strip the color code. 
     -- For detection purposes, let's catch the full string and let the validator verify it, 
     -- but our engine usually strips punctuation.
     -- The tokenizer splits on hyphens, so '888888-001' becomes '888888' and '001'.
     -- '888888' will match Pattern B. '001' will fail length check. 
     -- So Pattern B is sufficient for the split token case.

END $$;
