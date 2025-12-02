use anchor_lang::prelude::*;

/// Commitment pool account
#[account]
pub struct CommitmentPool {
    pub authority: Pubkey,           // Pool creator
    pub pool_id: u64,                // Unique pool ID
    pub goal_type: GoalType,         // Type of challenge
    pub stake_amount: u64,           // Amount to stake (lamports)
    pub duration_days: u8,            // How many days
    pub max_participants: u16,       // Max pool size
    pub min_participants: u16,       // Minimum required (1 for solo, 2+ for competitive)
    pub participant_count: u16,      // Current participants
    pub total_staked: u64,           // Total SOL in pool
    pub charity_address: Pubkey,      // Where loser stakes go (if charity mode)
    pub distribution_mode: DistributionMode, // How to distribute rewards
    pub pool_status: PoolStatus,     // Active, Ended, etc.
    pub start_timestamp: i64,        // When pool starts
    pub end_timestamp: i64,          // When pool ends
    pub bump: u8,                    // PDA bump
}

impl CommitmentPool {
    pub const LEN: usize = 8 +      // discriminator
        32 +                         // authority
        8 +                          // pool_id
        100 +                        // goal_type (variable, estimate)
        8 +                          // stake_amount
        1 +                          // duration_days
        2 +                          // max_participants
        2 +                          // min_participants
        2 +                          // participant_count
        8 +                          // total_staked
        32 +                         // charity_address
        4 +                          // distribution_mode
        4 +                          // pool_status
        8 +                          // start_timestamp
        8 +                          // end_timestamp
        1;                           // bump
}

/// Participant account
#[account]
pub struct Participant {
    pub pool: Pubkey,                // Which pool
    pub wallet: Pubkey,              // Participant wallet
    pub stake_amount: u64,           // Their stake
    pub join_timestamp: i64,          // When they joined
    pub status: ParticipantStatus,   // Current status
    pub days_verified: u8,            // Days successfully completed
    pub bump: u8,                    // PDA bump
}

impl Participant {
    pub const LEN: usize = 8 +       // discriminator
        32 +                          // pool
        32 +                          // wallet
        8 +                           // stake_amount
        8 +                           // join_timestamp
        4 +                           // status
        1 +                           // days_verified
        1;                            // bump
}

/// Goal type enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GoalType {
    /// Daily DCA challenge - must swap a certain amount daily
    DailyDCA {
        amount: u64,           // Amount to DCA daily
        token_mint: Pubkey     // Token to buy
    },
    /// HODL challenge - must hold a token above minimum balance
    HodlToken {
        token_mint: Pubkey,    // Token to hold
        min_balance: u64       // Minimum balance to maintain
    },
    /// Lifestyle habit challenge
    LifestyleHabit {
        habit_name: String,    // E.g., "Screen Time < 3h"
    }
}

/// Pool status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PoolStatus {
    Pending,      // Waiting to start
    Active,       // Currently running
    Ended,        // Pool finished
    Settled,      // Rewards distributed
}

/// Participant status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ParticipantStatus {
    Active,       // Still in the game
    Success,      // Completed successfully
    Failed,       // Didn't meet requirements
    Forfeit,      // Left early
}

/// Distribution mode enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DistributionMode {
    Competitive,  // Losers' stakes go to winners
    Charity,      // Losers' stakes go to charity
    Split { winner_percent: u8 },  // Split between winners and charity (0-100)
}

