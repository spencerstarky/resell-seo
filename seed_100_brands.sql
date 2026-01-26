-- SEED 100 TOP RESELLING BRANDS (FIXED)
-- This script inserts 100 brands and automatically generates the required 'normalized_name'.
-- Run this in Supabase SQL Editor.

INSERT INTO brands (name, slug, logo_url, confidence_tier, normalized_name)
SELECT 
    v.name, 
    v.slug, 
    v.logo_url, 
    v.confidence_tier, 
    LOWER(v.name) -- Auto-generate normalized_name
FROM (VALUES
    -- OUTDOOR & GORPCORE
    ('Patagonia', 'patagonia', NULL::text, 1),
    ('The North Face', 'the-north-face', NULL, 1),
    ('Arc''teryx', 'arcteryx', NULL, 1),
    ('Helly Hansen', 'helly-hansen', NULL, 1),
    ('Marmot', 'marmot', NULL, 1),
    ('Columbia', 'columbia', NULL, 1),
    ('Kuhl', 'kuhl', NULL, 1),
    ('Cotopaxi', 'cotopaxi', NULL, 1),
    ('Smartwool', 'smartwool', NULL, 1),
    ('Icebreaker', 'icebreaker', NULL, 1),
    ('Pendleton', 'pendleton', NULL, 1),
    ('Filson', 'filson', NULL, 1),
    ('Orvis', 'orvis', NULL, 1),
    ('REI Co-op', 'rei', NULL, 1),
    ('Fjallraven', 'fjallraven', NULL, 1),

    -- ATHLEISURE & ACTIVE
    ('Lululemon', 'lululemon', NULL, 1),
    ('Vuori', 'vuori', NULL, 1),
    ('Alo Yoga', 'alo-yoga', NULL, 1),
    ('Athleta', 'athleta', NULL, 1),
    ('Nike', 'nike', NULL, 1),
    ('Adidas', 'adidas', NULL, 1),
    ('Under Armour', 'under-armour', NULL, 1),
    ('Gymshark', 'gymshark', NULL, 1),
    ('Fabletics', 'fabletics', NULL, 1),
    ('Outdoor Voices', 'outdoor-voices', NULL, 1),
    ('Sweaty Betty', 'sweaty-betty', NULL, 1),

    -- FOOTWEAR
    ('Hoka One One', 'hoka', NULL, 1),
    ('On Running', 'on-running', NULL, 1),
    ('Brooks', 'brooks', NULL, 1),
    ('New Balance', 'new-balance', NULL, 1),
    ('Asics', 'asics', NULL, 1),
    ('Birkenstock', 'birkenstock', NULL, 1),
    ('Dr. Martens', 'dr-martens', NULL, 1),
    ('Red Wing', 'red-wing', NULL, 1),
    ('Danner', 'danner', NULL, 1),
    ('Blundstone', 'blundstone', NULL, 1),
    ('UGG', 'ugg', NULL, 1),
    ('Crocs', 'crocs', NULL, 1),
    ('Keen', 'keen', NULL, 1),
    ('Merrell', 'merrell', NULL, 1),
    ('Chaco', 'chaco', NULL, 1),
    ('Teva', 'teva', NULL, 1),
    ('Frye', 'frye', NULL, 1),

    -- WORKWEAR & DENIM
    ('Carhartt', 'carhartt', NULL, 1),
    ('Dickies', 'dickies', NULL, 1),
    ('Levi''s', 'levis', NULL, 1),
    ('Wrangler', 'wrangler', NULL, 1),
    ('Madewell', 'madewell', NULL, 1),
    ('Mother Denim', 'mother-denim', NULL, 1),
    ('Frame', 'frame', NULL, 1),
    ('Rag & Bone', 'rag-and-bone', NULL, 1),
    ('PAIGE', 'paige', NULL, 1),
    ('AG Jeans', 'ag-jeans', NULL, 1),
    ('7 For All Mankind', '7-for-all-mankind', NULL, 1),
    ('Lucky Brand', 'lucky-brand', NULL, 1),
    ('True Religion', 'true-religion', NULL, 1),

    -- STREETWEAR
    ('Supreme', 'supreme', NULL, 1),
    ('Stussy', 'stussy', NULL, 1),
    ('Bape', 'bape', NULL, 1),
    ('Kith', 'kith', NULL, 1),
    ('Palace', 'palace', NULL, 1),
    ('Off-White', 'off-white', NULL, 1),
    ('Fear of God', 'fear-of-god', NULL, 1),
    ('Stone Island', 'stone-island', NULL, 1),
    ('CP Company', 'cp-company', NULL, 1),
    ('Obey', 'obey', NULL, 1),

    -- LUXURY & HIGH END
    ('Gucci', 'gucci', NULL, 1),
    ('Louis Vuitton', 'louis-vuitton', NULL, 1),
    ('Prada', 'prada', NULL, 1),
    ('Burberry', 'burberry', NULL, 1),
    ('Moncler', 'moncler', NULL, 1),
    ('Canada Goose', 'canada-goose', NULL, 1),
    ('Ralph Lauren', 'ralph-lauren', NULL, 1),
    ('Brunello Cucinelli', 'brunello-cucinelli', NULL, 1),
    ('Loro Piana', 'loro-piana', NULL, 1),
    ('Missoni', 'missoni', NULL, 1),
    ('Etro', 'etro', NULL, 1),
    ('Versace', 'versace', NULL, 1),
    ('Fendi', 'fendi', NULL, 1),

    -- PREPPY & CLASSIC / GOLF
    ('Peter Millar', 'peter-millar', NULL, 1),
    ('TravisMathew', 'travismathew', NULL, 1),
    ('Vineyard Vines', 'vineyard-vines', NULL, 1),
    ('Lacoste', 'lacoste', NULL, 1),
    ('Tommy Hilfiger', 'tommy-hilfiger', NULL, 1),
    ('J.Crew', 'j-crew', NULL, 1),
    ('Brooks Brothers', 'brooks-brothers', NULL, 1),
    ('Lilly Pulitzer', 'lilly-pulitzer', NULL, 1),
    ('Gfore', 'gfore', NULL, 1),
    ('Greyson', 'greyson', NULL, 1),
    ('Rhoback', 'rhoback', NULL, 1),

    -- VINTAGE / HERITAGE
    ('Harley Davidson', 'harley-davidson', NULL, 1),
    ('Champion', 'champion', NULL, 1),
    ('Russell Athletic', 'russell-athletic', NULL, 1),
    ('Starter', 'starter', NULL, 1),
    ('Woolrich', 'woolrich', NULL, 1),
    ('LL Bean', 'll-bean', NULL, 1)

) as v(name, slug, logo_url, confidence_tier)
ON CONFLICT (slug) DO NOTHING;
