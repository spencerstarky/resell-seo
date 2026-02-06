-- Upgrade Style Matrix for Priority-Driven Logic
-- Phase 1 Implementation

-- 1. Create Enum for Priority Roles
DO $$ BEGIN
    CREATE TYPE priority_role_type AS ENUM (
        'lead_descriptor',       -- High prob to appear early / header
        'ordering_bias',         -- Influences placement order
        'protect_from_trimming', -- Survives cuts
        'include_if_space',      -- Filler attributes
        'fallback_descriptor',   -- Used if primaries missing
        'avoid_signal'           -- Explicit negative constraint
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add column to existing table
ALTER TABLE style_compatibility_attributes 
ADD COLUMN IF NOT EXISTS priority_role priority_role_type DEFAULT 'include_if_space';

-- 3. Update existing data with robust defaults (Heuristic update)
-- Use Cases and Garment Types generally become Lead Descriptors
UPDATE style_compatibility_attributes 
SET priority_role = 'lead_descriptor'
WHERE attribute_type IN ('use_case', 'garment_type') AND weight > 0.85;

-- High weight Materials/Details become Protected
UPDATE style_compatibility_attributes 
SET priority_role = 'protect_from_trimming'
WHERE attribute_type IN ('material', 'detail') AND weight > 0.9;

-- Lower weight items stay as include_if_space

-- 4. Specific adjustments for typical archetypes (Examples from PRD)
-- We can refine these via Admin UI later, but good defaults help.

-- Utility: Workwear (Lead), Multi-pocket (Protect)
UPDATE style_compatibility_attributes 
SET priority_role = 'lead_descriptor' 
WHERE attribute_value = 'Workwear' AND style_id IN (SELECT id FROM style_taxonomy WHERE style_name = 'utility');

UPDATE style_compatibility_attributes 
SET priority_role = 'protect_from_trimming' 
WHERE attribute_value = 'Multi-Pocket' AND style_id IN (SELECT id FROM style_taxonomy WHERE style_name = 'utility');

-- Gorpcore: Gore-Tex (Protect), Technical (Lead)
UPDATE style_compatibility_attributes 
SET priority_role = 'protect_from_trimming' 
WHERE attribute_value = 'Gore-Tex' AND style_id IN (SELECT id FROM style_taxonomy WHERE style_name = 'gorpcore');

UPDATE style_compatibility_attributes 
SET priority_role = 'lead_descriptor' 
WHERE attribute_value = 'Technical' AND style_id IN (SELECT id FROM style_taxonomy WHERE style_name = 'gorpcore');
