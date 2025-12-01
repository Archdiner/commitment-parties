-- Sample data for testing Commitment Agent
-- Run this in Supabase SQL Editor after creating the schema

-- Insert sample users
INSERT INTO users (wallet_address, username, reputation_score) VALUES
('11111111111111111111111111111111', 'test_user_1', 100),
('22222222222222222222222222222222', 'test_user_2', 95),
('33333333333333333333333333333333', 'test_user_3', 110)
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert sample pool
INSERT INTO pools (
    pool_id,
    pool_pubkey,
    creator_wallet,
    name,
    description,
    goal_type,
    goal_metadata,
    stake_amount,
    duration_days,
    max_participants,
    charity_address,
    start_timestamp,
    end_timestamp,
    status,
    is_public
) VALUES (
    1234567890,
    'TestPoolPubkey1111111111111111111111111111111',
    '11111111111111111111111111111111',
    'Daily DCA Challenge',
    'DCA 0.01 SOL daily for 7 days',
    'DailyDCA',
    '{"amount": 10000000, "token_mint": "So11111111111111111111111111111111111111112"}'::jsonb,
    0.5,
    7,
    10,
    'CharityAddress111111111111111111111111111111',
    EXTRACT(EPOCH FROM NOW())::bigint,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '7 days')::bigint,
    'active',
    true
)
ON CONFLICT (pool_id) DO NOTHING;

-- Insert sample check-ins
INSERT INTO checkins (pool_id, participant_wallet, day, success) VALUES
(1234567890, '11111111111111111111111111111111', 1, true),
(1234567890, '11111111111111111111111111111111', 2, true),
(1234567890, '22222222222222222222222222222222', 1, true)
ON CONFLICT (pool_id, participant_wallet, day) DO UPDATE
SET success = EXCLUDED.success, timestamp = NOW();

-- Insert sample pool events
INSERT INTO pool_events (pool_id, event_type, participant_wallet, metadata) VALUES
(1234567890, 'pool_created', '11111111111111111111111111111111', '{}'::jsonb),
(1234567890, 'participant_joined', '11111111111111111111111111111111', '{"stake": 0.5}'::jsonb),
(1234567890, 'participant_joined', '22222222222222222222222222222222', '{"stake": 0.5}'::jsonb),
(1234567890, 'checkin_submitted', '11111111111111111111111111111111', '{"day": 1, "success": true}'::jsonb);

