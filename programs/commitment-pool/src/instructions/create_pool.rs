use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = authority,
        space = CommitmentPool::LEN,
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, CommitmentPool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
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
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(stake_amount > 0, ErrorCode::InvalidStakeAmount);
    require!(duration_days > 0 && duration_days <= 30, ErrorCode::InvalidStakeAmount);
    require!(max_participants > 0 && max_participants <= 100, ErrorCode::InvalidStakeAmount);
    require!(min_participants > 0 && min_participants <= max_participants, ErrorCode::InvalidStakeAmount);
    
    // Validate distribution mode
    if let DistributionMode::Split { winner_percent } = distribution_mode {
        require!(winner_percent <= 100, ErrorCode::InvalidStakeAmount);
    }
    
    // Initialize pool
    pool.authority = ctx.accounts.authority.key();
    pool.pool_id = pool_id;
    pool.goal_type = goal_type;
    pool.stake_amount = stake_amount;
    pool.duration_days = duration_days;
    pool.max_participants = max_participants;
    pool.min_participants = min_participants;
    pool.participant_count = 0;
    pool.total_staked = 0;
    pool.charity_address = charity_address;
    pool.distribution_mode = distribution_mode;
    pool.pool_status = PoolStatus::Pending;
    pool.start_timestamp = clock.unix_timestamp;
    pool.end_timestamp = clock.unix_timestamp + (duration_days as i64 * 86400);
    pool.bump = ctx.bumps.pool;
    
    msg!("Pool created: {} (mode: {:?}, min: {}, max: {})", 
         pool_id, distribution_mode, min_participants, max_participants);
    Ok(())
}

