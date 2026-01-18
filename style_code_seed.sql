-- SEED DATA FOR STYLE CODE INTELLIGENCE
-- Run this AFTER running style_code_migration.sql

-- 1. Insert Brands
INSERT INTO brands (name, normalized_name, confidence_tier) VALUES 
('Patagonia', 'patagonia', 1),
('Nike', 'nike', 1),
('Adidas', 'adidas', 1),
('Levis', 'levis', 1),
('Lululemon', 'lululemon', 1),
('Carhartt', 'carhartt', 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Patterns

-- Patagonia: Often 4-5 digit numbers (e.g., 84212, 25580)
-- "STY84212" or just "84212"
INSERT INTO style_code_patterns (brand_id, regex_pattern, min_length, max_length, example_codes, confidence_weight)
VALUES (
  (SELECT id FROM brands WHERE normalized_name = 'patagonia'),
  '^\d{4,5}$', 
  4, 5, 
  ARRAY['84212', '25580'],
  1.0
);

-- Nike: 6 chars, usually Lettex2 + Numberx4 (e.g. BV3274) or 6 digits or 9 digits (######-###)
-- Common format: 2 letters + 4 numbers (e.g., CJ0952)
INSERT INTO style_code_patterns (brand_id, regex_pattern, min_length, max_length, example_codes, confidence_weight)
VALUES (
  (SELECT id FROM brands WHERE normalized_name = 'nike'),
  '^[A-Z]{2}\d{4}$', 
  6, 6, 
  ARRAY['BV3274', 'CJ0952'],
  1.0
);

-- Nike: 9 digit format (123456-789) - often seen on tags
INSERT INTO style_code_patterns (brand_id, regex_pattern, min_length, max_length, example_codes, confidence_weight)
VALUES (
  (SELECT id FROM brands WHERE normalized_name = 'nike'),
  '^\d{6}-\d{3}$', 
  10, 10, 
  ARRAY['315122-111', '807471-101'],
  1.0
);

-- Levi's: 3 or 4 digits usually (501, 505, 550, 560)
INSERT INTO style_code_patterns (brand_id, regex_pattern, min_length, max_length, example_codes, confidence_weight)
VALUES (
  (SELECT id FROM brands WHERE normalized_name = 'levis'),
  '^\d{3,4}$', 
  3, 4, 
  ARRAY['501', '505', '560'],
  0.8 -- Slightly lower because 3 digits can be random numbers too
);

-- Lululemon: Usually hidden in size dot, often W followed by characters (e.g., W5L93S)
-- But typically resell listings rely on looking up the "W-code"
INSERT INTO style_code_patterns (brand_id, regex_pattern, min_length, max_length, example_codes, confidence_weight)
VALUES (
  (SELECT id FROM brands WHERE normalized_name = 'lululemon'),
  '^W[A-Z0-9]{5}$', 
  6, 6, 
  ARRAY['W5L93S'],
  1.0
);
