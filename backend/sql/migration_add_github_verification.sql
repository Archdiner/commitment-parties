-- ================================================================
-- MIGRATION: Add GitHub verification support
-- Date: 2025-12-02
-- Description: Adds verified_github_username to users table for secure GitHub verification
-- ================================================================

-- Add verified_github_username column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verified_github_username'
    ) THEN
        ALTER TABLE users ADD COLUMN verified_github_username VARCHAR(100);
        COMMENT ON COLUMN users.verified_github_username IS 'GitHub username verified via Gist signature method';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(verified_github_username) WHERE verified_github_username IS NOT NULL;

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verified_github_username'
    ) THEN
        RAISE NOTICE 'verified_github_username column exists in users table';
    END IF;
END $$;

