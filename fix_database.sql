
-- Update the ebay_tokens table to include the missing columns
ALTER TABLE ebay_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ebay_tokens ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Verify the table structure
COMMENT ON TABLE ebay_tokens IS 'Stores eBay OAuth tokens for users';
