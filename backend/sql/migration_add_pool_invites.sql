-- ================================================================
-- MIGRATION: Add pool_invites table and is_public column
-- Date: 2025-12-02
-- Description: Adds support for private/public pools with invites
-- ================================================================

-- Add is_public column to pools table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE pools ADD COLUMN is_public BOOLEAN DEFAULT true;
        COMMENT ON COLUMN pools.is_public IS 'Whether the pool is public (anyone can join) or private (invite only)';
    END IF;
END $$;

-- Create pool_invites table
CREATE TABLE IF NOT EXISTS pool_invites (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    invitee_wallet VARCHAR(44) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pool_id, invitee_wallet)
);

-- Create indexes for pool_invites
CREATE INDEX IF NOT EXISTS idx_pool_invites_pool ON pool_invites(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_invites_wallet ON pool_invites(invitee_wallet);
CREATE INDEX IF NOT EXISTS idx_pool_invites_pool_wallet ON pool_invites(pool_id, invitee_wallet);

-- Add table comment
COMMENT ON TABLE pool_invites IS 'Invites for private pools';

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'pool_invites table created';
    RAISE NOTICE 'Indexes created for pool_invites';
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'is_public'
    ) THEN
        RAISE NOTICE 'is_public column exists in pools table';
    END IF;
END $$;

