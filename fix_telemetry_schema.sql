-- Fix missing column in style_code_detections
ALTER TABLE style_code_detections
ADD COLUMN IF NOT EXISTS detected_brand_name TEXT;
