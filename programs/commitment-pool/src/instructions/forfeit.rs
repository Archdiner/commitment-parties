use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ForfeitPool<'info> {
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
    
    #[account(mut)]
    pub participant_wallet: Signer<'info>,
}

pub fn handler(ctx: Context<ForfeitPool>) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let participant = &mut ctx.accounts.participant;
    
    // Validate pool is active
    require!(
        pool.pool_status == PoolStatus::Active,
        ErrorCode::PoolNotActive
    );
    
    // Validate participant is the signer
    require!(
        participant.wallet == ctx.accounts.participant_wallet.key(),
        ErrorCode::Unauthorized
    );
    
    // Validate participant is active (can't forfeit if already failed/success/forfeit)
    require!(
        participant.status == ParticipantStatus::Active,
        ErrorCode::PoolNotActive
    );
    
    // Mark participant as forfeit
    participant.status = ParticipantStatus::Forfeit;
    
    msg!("Participant {} forfeited pool {}", participant.wallet, pool.pool_id);
    
    Ok(())
}
