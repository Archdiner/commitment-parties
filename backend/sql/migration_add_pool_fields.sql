-- ================================================================
-- MIGRATION: Add missing pool configuration fields
-- Date: 2025-12-04
-- Description: Adds recruitment_period_hours, scheduled_start_time, 
--              require_min_participants, grace_period_minutes, min_participants
-- ================================================================

-- Add recruitment_period_hours column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'recruitment_period_hours'
    ) THEN
        ALTER TABLE pools ADD COLUMN recruitment_period_hours INTEGER DEFAULT 24;
        COMMENT ON COLUMN pools.recruitment_period_hours IS 'Recruitment period in hours before challenge starts (0=immediate, 24=1day, 168=1week)';
    END IF;
END $$;

-- Add scheduled_start_time column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'scheduled_start_time'
    ) THEN
        ALTER TABLE pools ADD COLUMN scheduled_start_time BIGINT;
        COMMENT ON COLUMN pools.scheduled_start_time IS 'Unix timestamp when pool is scheduled to start (null for immediate start)';
    END IF;
END $$;

-- Add require_min_participants column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'require_min_participants'
    ) THEN
        ALTER TABLE pools ADD COLUMN require_min_participants BOOLEAN DEFAULT false;
        COMMENT ON COLUMN pools.require_min_participants IS 'If true, pool won''t start until minimum participants joined';
    END IF;
END $$;

-- Add grace_period_minutes column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'grace_period_minutes'
    ) THEN
        ALTER TABLE pools ADD COLUMN grace_period_minutes INTEGER DEFAULT 5;
        COMMENT ON COLUMN pools.grace_period_minutes IS 'Grace period in minutes after pool starts before verification begins (default: 5 minutes)';
    END IF;
END $$;

-- Add min_participants column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pools' 
        AND column_name = 'min_participants'
    ) THEN
        ALTER TABLE pools ADD COLUMN min_participants INTEGER DEFAULT 1;
        COMMENT ON COLUMN pools.min_participants IS 'Minimum number of participants required to start pool';
    END IF;
END $$;

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added columns: recruitment_period_hours, scheduled_start_time, require_min_participants, grace_period_minutes, min_participants';
END $$;

