-- ================================================================
-- COMMITMENT AGENT DATABASE SCHEMA v2
-- Complete schema with all improvements
-- ================================================================


-- Users table
CREATE TABLE IF NOT EXISTS users (
    wallet_address VARCHAR(44) PRIMARY KEY,
    username VARCHAR(50),
    twitter_handle VARCHAR(50),
    reputation_score INTEGER DEFAULT 100,
    total_games INTEGER DEFAULT 0,
    games_completed INTEGER DEFAULT 0,
    total_earned DECIMAL(10, 4) DEFAULT 0,
    streak_count INTEGER DEFAULT 0,  -- For streak bonuses
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- Pools table
CREATE TABLE IF NOT EXISTS pools (
    pool_id BIGINT PRIMARY KEY,
    pool_pubkey VARCHAR(44) UNIQUE NOT NULL,
    creator_wallet VARCHAR(44) REFERENCES users(wallet_address),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Goal configuration
    goal_type VARCHAR(50) NOT NULL,
    goal_metadata JSONB,
    
    -- Financial configuration
    stake_amount DECIMAL(10, 4) NOT NULL,
    duration_days INTEGER NOT NULL,
    max_participants INTEGER NOT NULL,
    participant_count INTEGER DEFAULT 0,
    
    -- Distribution configuration
    distribution_mode VARCHAR(20) NOT NULL DEFAULT 'competitive',
    split_percentage_winners INTEGER DEFAULT 100,
    
    -- Charity
    charity_address VARCHAR(44) NOT NULL,
    
    -- Yield tracking
    total_staked DECIMAL(10, 4) DEFAULT 0,
    yield_earned DECIMAL(10, 4) DEFAULT 0,
    yield_last_updated TIMESTAMP,
    final_pool_value DECIMAL(10, 4),
    
    -- Timestamps
    start_timestamp BIGINT NOT NULL,
    end_timestamp BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Visibility
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_split_percentage 
        CHECK (split_percentage_winners >= 0 AND split_percentage_winners <= 100)
);


-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) REFERENCES users(wallet_address),
    
    -- On-chain data mirror
    participant_pubkey VARCHAR(44) UNIQUE NOT NULL,
    stake_amount DECIMAL(10, 4) NOT NULL,
    join_timestamp BIGINT NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    days_verified INTEGER DEFAULT 0,
    
    -- Timestamps
    joined_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pool_id, wallet_address)
);


-- Verifications table (for all goal types)
CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    participant_wallet VARCHAR(44) REFERENCES users(wallet_address),
    day INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    verification_type VARCHAR(20) NOT NULL,
    proof_data JSONB,
    verified_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pool_id, participant_wallet, day)
);


-- Check-ins table (lifestyle challenges - backward compatible)
CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    participant_wallet VARCHAR(44) REFERENCES users(wallet_address),
    day INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    screenshot_url VARCHAR(500),
    timestamp TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pool_id, participant_wallet, day)
);


-- Payouts table (settlement records)
CREATE TABLE IF NOT EXISTS payouts (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    recipient_wallet VARCHAR(44) REFERENCES users(wallet_address),
    amount DECIMAL(10, 4) NOT NULL,
    payout_type VARCHAR(20) NOT NULL,
    transaction_hash VARCHAR(88),
    paid_at TIMESTAMP DEFAULT NOW()
);


-- Pool events (activity feed)
CREATE TABLE IF NOT EXISTS pool_events (
    id SERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(pool_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    participant_wallet VARCHAR(44) REFERENCES users(wallet_address),
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);


-- ================================================================
-- INDEXES
-- ================================================================


-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_streak ON users(streak_count DESC);


-- Pools indexes
CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_pools_created_at ON pools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pools_goal_type ON pools(goal_type);
CREATE INDEX IF NOT EXISTS idx_pools_is_public ON pools(is_public);


-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_participants_pool ON participants(pool_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_pool_status ON participants(pool_id, status);


-- Verifications indexes
CREATE INDEX IF NOT EXISTS idx_verifications_pool ON verifications(pool_id);
CREATE INDEX IF NOT EXISTS idx_verifications_participant ON verifications(participant_wallet);
CREATE INDEX IF NOT EXISTS idx_verifications_pool_participant ON verifications(pool_id, participant_wallet);


-- Checkins indexes
CREATE INDEX IF NOT EXISTS idx_checkins_pool ON checkins(pool_id);
CREATE INDEX IF NOT EXISTS idx_checkins_participant ON checkins(participant_wallet);
CREATE INDEX IF NOT EXISTS idx_checkins_pool_participant ON checkins(pool_id, participant_wallet);


-- Payouts indexes
CREATE INDEX IF NOT EXISTS idx_payouts_pool ON payouts(pool_id);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON payouts(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_payouts_type ON payouts(payout_type);


-- Pool events indexes
CREATE INDEX IF NOT EXISTS idx_pool_events_pool ON pool_events(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_events_timestamp ON pool_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pool_events_type ON pool_events(event_type);


-- ================================================================
-- TRIGGERS
-- ================================================================


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS update_pools_updated_at ON pools;
CREATE TRIGGER update_pools_updated_at 
    BEFORE UPDATE ON pools
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
CREATE TRIGGER update_participants_updated_at 
    BEFORE UPDATE ON participants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- COMMENTS
-- ================================================================


COMMENT ON TABLE users IS 'User accounts identified by wallet address';
COMMENT ON TABLE pools IS 'Commitment pools with goals and stakes';
COMMENT ON TABLE participants IS 'Tracks individual participation in pools';
COMMENT ON TABLE verifications IS 'Daily verification logs for all participants';
COMMENT ON TABLE checkins IS 'Daily check-ins for lifestyle challenges (user-submitted)';
COMMENT ON TABLE payouts IS 'Record of all payouts from pool settlements';
COMMENT ON TABLE pool_events IS 'Activity feed for pool events';


COMMENT ON COLUMN pools.goal_metadata IS 
    'JSON metadata specific to goal type (DCA amount, token mint, etc.)';
COMMENT ON COLUMN pools.status IS 
    'Pool status: pending, active, ended, settled';
COMMENT ON COLUMN pools.distribution_mode IS 
    'Distribution mode: competitive, charity, split';
COMMENT ON COLUMN pools.split_percentage_winners IS 
    'Percentage of losers stakes to winners (0-100). Remainder goes to charity.';
COMMENT ON COLUMN participants.status IS 
    'Status: active, success, failed, forfeit';
COMMENT ON COLUMN verifications.verification_type IS 
    'Type: on_chain (crypto challenges), checkin (honor system), screenshot (photo proof)';
COMMENT ON COLUMN verifications.proof_data IS 
    'JSON with proof details: {tx_hash, screenshot_url, ocr_result, etc.}';
COMMENT ON COLUMN payouts.payout_type IS 
    'Type: winner (successful participant), charity (failed stakes), protocol_fee (operations)';

