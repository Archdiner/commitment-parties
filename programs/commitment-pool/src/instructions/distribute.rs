use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.pool_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, CommitmentPool>,
    
    /// CHECK: Pool vault containing all stakes
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,
    
    /// CHECK: AI agent authority (should be verified off-chain)
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DistributeRewards>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;
    
    // Check pool has ended
    require!(
        pool.pool_status == PoolStatus::Ended || clock.unix_timestamp >= pool.end_timestamp,
        ErrorCode::PoolNotEnded
    );
    
    // Mark pool as ended if not already
    if pool.pool_status == PoolStatus::Active {
        pool.pool_status = PoolStatus::Ended;
    }
    
    // Note: Actual distribution logic would require iterating through participants
    // This is a simplified version. In production, you'd need to:
    // 1. Query all participant accounts
    // 2. Calculate winners (status == Success)
    // 3. Calculate total winner stakes
    // 4. Distribute pool vault to winners proportionally
    // 5. Send loser stakes to charity
    
    // For now, we'll mark the pool as settled
    // The agent will handle the actual distribution logic off-chain
    // and call individual transfer instructions
    
    pool.pool_status = PoolStatus::Settled;
    
    msg!("Pool {} marked as settled. Distribution should be handled by agent.", pool.pool_id);
    
    Ok(())
}

