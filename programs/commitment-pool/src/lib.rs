use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("GSvoKxVHbtAY2mAAU4RM3PVQC3buLSjRm24N7QhAoieH");

#[program]
pub mod commitment_pool {
    use super::*;

    /// Creates a new commitment pool
    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        goal_type: GoalType,
        stake_amount: u64,
        duration_days: u8,
        max_participants: u16,
        min_participants: u16,
        charity_address: Pubkey,
        distribution_mode: DistributionMode,
    ) -> Result<()> {
        instructions::create_pool::handler(
            ctx,
            pool_id,
            goal_type,
            stake_amount,
            duration_days,
            max_participants,
            min_participants,
            charity_address,
            distribution_mode,
        )
    }

    /// Allows a user to join a pool by staking SOL
    pub fn join_pool(ctx: Context<JoinPool>) -> Result<()> {
        instructions::join_pool::handler(ctx)
    }

    /// Verifies a participant's progress (called by AI agent)
    pub fn verify_participant(
        ctx: Context<VerifyParticipant>,
        day: u8,
        passed: bool,
    ) -> Result<()> {
        instructions::verify::handler(ctx, day, passed)
    }

    /// Distributes rewards when pool ends (called by AI agent)
    pub fn distribute_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
        instructions::distribute::handler(ctx)
    }
}

