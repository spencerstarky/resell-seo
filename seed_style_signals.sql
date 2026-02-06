-- Seed Detection Signals for 20 Style Archetypes

DO $$
DECLARE
    s_id UUID;
BEGIN

    -- 1. Utility
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'utility';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'utility', 1.0),
        (s_id, 'text', 'safari', 0.9),
        (s_id, 'text', 'cargo', 0.8),
        (s_id, 'text', 'field jacket', 0.8),
        (s_id, 'text', 'workwear', 0.7);
    END IF;

    -- 2. Gorpcore
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'gorpcore';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'gorpcore', 1.0),
        (s_id, 'text', 'gore-tex', 0.95),
        (s_id, 'text', 'arcteryx', 0.95),
        (s_id, 'text', 'patagonia', 0.9),
        (s_id, 'text', 'north face', 0.85),
        (s_id, 'text', 'hiking', 0.8),
        (s_id, 'text', 'technical', 0.8),
        (s_id, 'text', 'trekking', 0.75);
    END IF;

    -- 3. Preppy
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'preppy';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'preppy', 1.0),
        (s_id, 'text', 'ralph lauren', 0.95),
        (s_id, 'text', 'ivy league', 0.9),
        (s_id, 'text', 'brooks brothers', 0.9),
        (s_id, 'text', 'vineyard vines', 0.9),
        (s_id, 'text', 'lilly pulitzer', 0.95), -- Explicitly adding this for your test case
        (s_id, 'text', 'polo', 0.85),
        (s_id, 'text', 'rugby', 0.8),
        (s_id, 'text', 'argyle', 0.8),
        (s_id, 'text', 'lacoste', 0.85);
    END IF;

    -- 4. Y2K
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'y2k';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'y2k', 1.0),
         (s_id, 'text', '2000s', 0.9),
         (s_id, 'text', 'mcbling', 0.9),
         (s_id, 'text', 'juicy couture', 0.95),
         (s_id, 'text', 'baby tee', 0.85),
         (s_id, 'text', 'rhinestone', 0.8),
         (s_id, 'text', 'low rise', 0.85),
         (s_id, 'text', 'ed hardy', 0.9);
    END IF;

    -- 5. Minimalist
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'minimalist';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'minimalist', 1.0),
        (s_id, 'text', 'scandinavian', 0.9),
        (s_id, 'text', 'cos', 0.9),
        (s_id, 'text', 'arket', 0.85),
        (s_id, 'text', 'clean lines', 0.8),
        (s_id, 'text', 'neutral', 0.75),
        (s_id, 'text', 'capsule', 0.8);
    END IF;

     -- 6. Workwear
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'workwear';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'workwear', 1.0),
        (s_id, 'text', 'carhartt', 0.95),
        (s_id, 'text', 'dickies', 0.95),
        (s_id, 'text', 'double knee', 0.9),
        (s_id, 'text', 'carpenter', 0.85),
        (s_id, 'text', 'canvas', 0.75),
        (s_id, 'text', 'rugged', 0.8);
    END IF;

    -- 7. Western
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'western';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'western', 1.0),
        (s_id, 'text', 'cowboy', 0.95),
        (s_id, 'text', 'wrangler', 0.9),
        (s_id, 'text', 'pearl snap', 0.9),
        (s_id, 'text', 'rodeo', 0.85),
        (s_id, 'text', 'fringe', 0.8);
    END IF;
    
    -- 8. Streetwear
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'streetwear';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'streetwear', 1.0),
        (s_id, 'text', 'supreme', 0.95),
        (s_id, 'text', 'stussy', 0.95),
        (s_id, 'text', 'off-white', 0.95),
        (s_id, 'text', 'oversized', 0.8),
        (s_id, 'text', 'hypebeast', 0.9);
    END IF;

    -- 9. Boho
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'boho';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'boho', 1.0),
        (s_id, 'text', 'bohemian', 0.95),
        (s_id, 'text', 'free people', 0.95),
        (s_id, 'text', 'anthropologie', 0.9),
        (s_id, 'text', 'floral', 0.7),
        (s_id, 'text', 'festival', 0.8),
        (s_id, 'text', 'peasant', 0.85);
    END IF;
    
    -- 10. Cottagecore
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'cottagecore';
    IF s_id IS NOT NULL THEN
        DELETE FROM style_signals WHERE style_id = s_id;
        INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
        (s_id, 'text', 'cottagecore', 1.0),
        (s_id, 'text', 'prairie', 0.9),
        (s_id, 'text', 'gunne sax', 0.95),
        (s_id, 'text', 'laura ashley', 0.9),
        (s_id, 'text', 'puff sleeve', 0.85),
        (s_id, 'text', 'gingham', 0.8);
    END IF;

    -- 11. Dark Academia
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'dark_academia';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'dark academia', 1.0),
         (s_id, 'text', 'tweed', 0.85),
         (s_id, 'text', 'plaid', 0.8),
         (s_id, 'text', 'blazer', 0.75),
         (s_id, 'text', 'wool', 0.7),
         (s_id, 'text', 'scholarly', 0.85);
    END IF;

    -- 12. Athleisure
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'athleisure';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'athleisure', 1.0),
         (s_id, 'text', 'lululemon', 0.95),
         (s_id, 'text', 'aloyoga', 0.95),
         (s_id, 'text', 'nike', 0.9),
         (s_id, 'text', 'adidas', 0.9),
         (s_id, 'text', 'gymshark', 0.9),
         (s_id, 'text', 'yoga', 0.8),
         (s_id, 'text', 'leggings', 0.8);
    END IF;

    -- 13. Vintage
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'vintage';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'vintage', 1.0),
         (s_id, 'text', 'retro', 0.8),
         (s_id, 'text', '90s', 0.8),
         (s_id, 'text', '80s', 0.8),
         (s_id, 'text', '70s', 0.8),
         (s_id, 'text', 'made in usa', 0.85),
         (s_id, 'text', 'single stitch', 0.9);
    END IF;
    
    -- 14. Grunge
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'grunge';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'grunge', 1.0),
         (s_id, 'text', 'nirvana', 0.8),
         (s_id, 'text', 'flannel', 0.85),
         (s_id, 'text', 'distressed', 0.8),
         (s_id, 'text', 'ripped', 0.8);
    END IF;

    -- 15. Skate
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'skate';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'skate', 1.0),
         (s_id, 'text', 'vans', 0.9),
         (s_id, 'text', 'thrasher', 0.9),
         (s_id, 'text', 'palace', 0.9),
         (s_id, 'text', 'baggy', 0.75);
    END IF;
    
    -- 16. Coastal
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'coastal';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'coastal', 1.0),
         (s_id, 'text', 'resort', 0.9),
         (s_id, 'text', 'tommy bahama', 0.9),
         (s_id, 'text', 'linen', 0.85),
         (s_id, 'text', 'vacation', 0.8);
    END IF;

    -- 17. Military
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'military';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'military', 1.0),
         (s_id, 'text', 'tactical', 0.9),
         (s_id, 'text', 'surplus', 0.9),
         (s_id, 'text', 'camo', 0.85),
         (s_id, 'text', 'field', 0.7);
    END IF;

    -- 18. Biker
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'biker';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'biker', 1.0),
         (s_id, 'text', 'moto', 0.95),
         (s_id, 'text', 'harley davidson', 0.95),
         (s_id, 'text', 'leather', 0.75);
    END IF;

    -- 19. Evening
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'evening';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'evening', 1.0),
         (s_id, 'text', 'formal', 0.95),
         (s_id, 'text', 'black tie', 0.95),
         (s_id, 'text', 'cocktail', 0.9),
         (s_id, 'text', 'gown', 0.85); -- Replaces 'dress' which is too generic
    END IF;

    -- 20. Avant Garde
    SELECT id INTO s_id FROM style_taxonomy WHERE style_name = 'avant_garde';
    IF s_id IS NOT NULL THEN
         DELETE FROM style_signals WHERE style_id = s_id;
         INSERT INTO style_signals (style_id, signal_type, signal_value, weight) VALUES
         (s_id, 'text', 'avant garde', 1.0),
         (s_id, 'text', 'rick owens', 0.95),
         (s_id, 'text', 'margiela', 0.95),
         (s_id, 'text', 'comme des garcons', 0.95),
         (s_id, 'text', 'yohji yamamoto', 0.95),
         (s_id, 'text', 'deconstructed', 0.85);
    END IF;

END $$;
