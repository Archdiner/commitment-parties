use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(day: u8)]
pub struct VerifyParticipant<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.pool_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, CommitmentPool>,
    
    #[account(
        mut,
        seeds = [b"participant", pool.key().as_ref(), participant.wallet.as_ref()],
        bump = participant.bump
    )]
    pub participant: Account<'info, Participant>,
    
    /// CHECK: AI agent authority (should be verified off-chain)
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<VerifyParticipant>,
    day: u8,
    passed: bool,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let participant = &ctx.accounts.participant;
    
    // Validate pool is active
    require!(
        pool.pool_status == PoolStatus::Active,
        ErrorCode::PoolNotActive
    );
    
    // Validate day number
    require!(
        day > 0 && day <= pool.duration_days,
        ErrorCode::InvalidDay
    );
    
    // Note: Status and days_verified are tracked off-chain (database)
    // This instruction is kept for logging/auditing purposes only
    // The agent updates the database before calling this instruction
    
    msg!("Verified participant {} for day {}: {}", 
         participant.wallet, day, if passed { "PASSED" } else { "FAILED" });
    
    Ok(())
}


