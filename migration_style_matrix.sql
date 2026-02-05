-- Create table for Compatibility Attributes
CREATE TABLE IF NOT EXISTS style_compatibility_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_id UUID REFERENCES style_taxonomy(id) ON DELETE CASCADE,
    attribute_value TEXT NOT NULL,
    attribute_type TEXT CHECK (attribute_type IN ('aesthetic', 'use_case', 'material', 'detail', 'garment_type')),
    weight FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure RLS
ALTER TABLE style_compatibility_attributes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Style Matrix" ON style_compatibility_attributes;
CREATE POLICY "Public Read Style Matrix" ON style_compatibility_attributes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin Write Style Matrix" ON style_compatibility_attributes;
CREATE POLICY "Admin Write Style Matrix" ON style_compatibility_attributes FOR ALL TO authenticated USING (true);

-- Seed Data
DO $$
DECLARE
    s_id UUID;
BEGIN
    -- 1. Utility
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('utility', 'Utility', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Safari', 'aesthetic', 0.95),
    (s_id, 'Travel', 'use_case', 0.90),
    (s_id, 'Workwear', 'aesthetic', 0.85),
    (s_id, 'Outdoor', 'use_case', 0.85),
    (s_id, 'Nylon', 'material', 0.80),
    (s_id, 'Ripstop', 'material', 0.80),
    (s_id, 'Canvas', 'material', 0.75),
    (s_id, 'Multi-Pocket', 'detail', 0.90),
    (s_id, 'Fishing', 'use_case', 0.70),
    (s_id, 'Hiking', 'use_case', 0.65);

    -- 2. Gorpcore
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('gorpcore', 'Gorpcore', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Technical', 'aesthetic', 0.95),
    (s_id, 'Outdoor', 'use_case', 0.90),
    (s_id, 'Waterproof', 'detail', 0.85),
    (s_id, 'Gore-Tex', 'material', 0.95),
    (s_id, 'Trekking', 'use_case', 0.80),
    (s_id, 'Camping', 'use_case', 0.75),
    (s_id, 'Windbreaker', 'garment_type', 0.85),
    (s_id, 'Fleece', 'material', 0.80);

    -- 3. Preppy
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('preppy', 'Preppy', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Ivy League', 'aesthetic', 0.90),
    (s_id, 'Collegiate', 'aesthetic', 0.88),
    (s_id, 'Heritage', 'aesthetic', 0.85),
    (s_id, 'Classic', 'aesthetic', 0.80),
    (s_id, 'Nautical', 'aesthetic', 0.75),
    (s_id, 'Country Club', 'use_case', 0.70),
    (s_id, 'Golf', 'use_case', 0.70),
    (s_id, 'Cotton', 'material', 0.60),
    (s_id, 'Wool', 'material', 0.65);

    -- 4. Y2K
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('y2k', 'Y2K', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Retro', 'aesthetic', 0.85),
    (s_id, '2000s', 'aesthetic', 0.95),
    (s_id, 'Cyber', 'aesthetic', 0.80),
    (s_id, 'McBling', 'aesthetic', 0.85),
    (s_id, 'Low Rise', 'detail', 0.90),
    (s_id, 'Baby Tee', 'garment_type', 0.85),
    (s_id, 'Bedazzled', 'detail', 0.80),
    (s_id, 'Rhinestone', 'detail', 0.80),
    (s_id, 'Denim', 'material', 0.70);

    -- 5. Minimalist
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('minimalist', 'Minimalist', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Modern', 'aesthetic', 0.85),
    (s_id, 'Clean', 'aesthetic', 0.90),
    (s_id, 'Scandinavian', 'aesthetic', 0.85),
    (s_id, 'Neutral', 'aesthetic', 0.80),
    (s_id, 'Capsule Wardrobe', 'use_case', 0.75),
    (s_id, 'Boxy', 'detail', 0.70),
    (s_id, 'Oversized', 'detail', 0.65),
    (s_id, 'Linen', 'material', 0.80);

    -- 6. Workwear
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('workwear', 'Workwear', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Rugged', 'aesthetic', 0.90),
    (s_id, 'Durable', 'aesthetic', 0.80),
    (s_id, 'Carpenter', 'detail', 0.95),
    (s_id, 'Double Knee', 'detail', 0.95),
    (s_id, 'Canvas', 'material', 0.85),
    (s_id, 'Denim', 'material', 0.80),
    (s_id, 'Heavyweight', 'detail', 0.75),
    (s_id, 'Chore', 'garment_type', 0.85);

    -- 7. Western
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('western', 'Western', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Cowboy', 'aesthetic', 0.95),
    (s_id, 'Ranch', 'use_case', 0.85),
    (s_id, 'Rodeo', 'use_case', 0.90),
    (s_id, 'Pearl Snap', 'detail', 0.95),
    (s_id, 'Yoke', 'detail', 0.80),
    (s_id, 'Southwestern', 'aesthetic', 0.85),
    (s_id, 'Denim', 'material', 0.80),
    (s_id, 'Leather', 'material', 0.75),
    (s_id, 'Aztec', 'detail', 0.75);

    -- 8. Streetwear
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('streetwear', 'Streetwear', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Urban', 'aesthetic', 0.85),
    (s_id, 'Hypebeast', 'aesthetic', 0.80),
    (s_id, 'Graphic', 'detail', 0.85),
    (s_id, 'Oversized', 'detail', 0.90),
    (s_id, 'Logo', 'detail', 0.85),
    (s_id, 'Hoodie', 'garment_type', 0.80),
    (s_id, 'Sneakerhead', 'use_case', 0.70);

    -- 9. Boho
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('boho', 'Boho', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Bohemian', 'aesthetic', 0.95),
    (s_id, 'Festival', 'use_case', 0.90),
    (s_id, 'Romance', 'aesthetic', 0.75),
    (s_id, 'Peasant', 'garment_type', 0.85),
    (s_id, 'Floral', 'detail', 0.80),
    (s_id, 'Embroidered', 'detail', 0.85),
    (s_id, 'Crochet', 'detail', 0.85),
    (s_id, 'Flowy', 'detail', 0.80);

    -- 10. Cottagecore
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('cottagecore', 'Cottagecore', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Prairie', 'aesthetic', 0.90),
    (s_id, 'Romantic', 'aesthetic', 0.85),
    (s_id, 'Feminine', 'aesthetic', 0.80),
    (s_id, 'Floral', 'detail', 0.85),
    (s_id, 'Puff Sleeve', 'detail', 0.90),
    (s_id, 'Linen', 'material', 0.80),
    (s_id, 'Gingham', 'detail', 0.85);

    -- 11. Dark Academia
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('dark_academia', 'Dark Academia', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Scholarly', 'aesthetic', 0.85),
    (s_id, 'Moody', 'aesthetic', 0.80),
    (s_id, 'Vintage', 'aesthetic', 0.75),
    (s_id, 'Tweed', 'material', 0.95),
    (s_id, 'Wool', 'material', 0.90),
    (s_id, 'Plaid', 'detail', 0.85),
    (s_id, 'Blazer', 'garment_type', 0.90);

    -- 12. Athleisure
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('athleisure', 'Athleisure', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Sport', 'use_case', 0.90),
    (s_id, 'Gym', 'use_case', 0.95),
    (s_id, 'Yoga', 'use_case', 0.95),
    (s_id, 'Running', 'use_case', 0.90),
    (s_id, 'Performance', 'aesthetic', 0.80),
    (s_id, 'Stretch', 'detail', 0.85),
    (s_id, 'Moisture Wicking', 'detail', 0.90),
    (s_id, 'Leggings', 'garment_type', 0.95);

    -- 13. Vintage
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('vintage', 'Vintage', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Retro', 'aesthetic', 0.95),
    (s_id, 'Classic', 'aesthetic', 0.75),
    (s_id, 'Single Stitch', 'detail', 0.90),
    (s_id, 'Made in USA', 'detail', 0.85),
    (s_id, 'Faded', 'detail', 0.80),
    (s_id, 'Distressed', 'detail', 0.80);

    -- 14. Grunge
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('grunge', 'Grunge', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Distressed', 'aesthetic', 0.95),
    (s_id, 'Ripped', 'detail', 0.90),
    (s_id, 'Flannel', 'material', 0.95),
    (s_id, 'Oversized', 'detail', 0.85),
    (s_id, '90s', 'aesthetic', 0.90),
    (s_id, 'Plaid', 'detail', 0.80);

    -- 15. Skate
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('skate', 'Skate', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Skater', 'aesthetic', 0.95),
    (s_id, 'Board', 'use_case', 0.85),
    (s_id, 'Baggy', 'detail', 0.90),
    (s_id, 'Durable', 'aesthetic', 0.80),
    (s_id, 'Cargo', 'detail', 0.85);

    -- 16. Coastal
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('coastal', 'Coastal / Resort', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Resort', 'aesthetic', 0.95),
    (s_id, 'Vacation', 'use_case', 0.90),
    (s_id, 'Beach', 'use_case', 0.90),
    (s_id, 'Summer', 'use_case', 0.85),
    (s_id, 'Linen', 'material', 0.95),
    (s_id, 'Tropical', 'detail', 0.85),
    (s_id, 'Lightweight', 'detail', 0.80),
    (s_id, 'Breezy', 'aesthetic', 0.80);

    -- 17. Military
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('military', 'Military', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Tactical', 'aesthetic', 0.90),
    (s_id, 'Surplus', 'aesthetic', 0.85),
    (s_id, 'Camo', 'detail', 0.95),
    (s_id, 'Olive', 'detail', 0.80),
    (s_id, 'Utility', 'aesthetic', 0.85),
    (s_id, 'Field', 'use_case', 0.80);

    -- 18. Biker
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('biker', 'Biker', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Moto', 'aesthetic', 0.95),
    (s_id, 'Rider', 'use_case', 0.90),
    (s_id, 'Edgy', 'aesthetic', 0.85),
    (s_id, 'Leather', 'material', 0.95),
    (s_id, 'Zipper', 'detail', 0.80),
    (s_id, 'Punk', 'aesthetic', 0.75);

    -- 19. Evening
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('evening', 'Evening / Formal', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Black Tie', 'aesthetic', 0.95),
    (s_id, 'Cocktail', 'use_case', 0.90),
    (s_id, 'Wedding', 'use_case', 0.90),
    (s_id, 'Elegant', 'aesthetic', 0.85),
    (s_id, 'Silk', 'material', 0.85),
    (s_id, 'Satin', 'material', 0.80),
    (s_id, 'Sequins', 'detail', 0.85);

    -- 20. Avant Garde
    INSERT INTO style_taxonomy (style_name, display_name, confidence_floor, category_whitelist)
    VALUES ('avant_garde', 'Avant Garde', 0.7, '{}')
    ON CONFLICT (style_name) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO s_id;

    DELETE FROM style_compatibility_attributes WHERE style_id = s_id;
    INSERT INTO style_compatibility_attributes (style_id, attribute_value, attribute_type, weight) VALUES
    (s_id, 'Archival', 'aesthetic', 0.95),
    (s_id, 'Runway', 'aesthetic', 0.90),
    (s_id, 'Deconstructed', 'detail', 0.95),
    (s_id, 'Asymmetric', 'detail', 0.90),
    (s_id, 'High Fashion', 'aesthetic', 0.85),
    (s_id, 'Artistic', 'aesthetic', 0.80);

END $$;
