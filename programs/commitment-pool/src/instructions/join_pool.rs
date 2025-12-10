use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct JoinPool<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.pool_id.to_le_bytes().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, CommitmentPool>,
    
    #[account(
        init,
        payer = participant,
        space = Participant::LEN,
        seeds = [b"participant", pool.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub participant_account: Account<'info, Participant>,
    
    #[account(mut)]
    pub participant: Signer<'info>,
    
    /// CHECK: Pool vault to hold stakes
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinPool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let participant_account = &mut ctx.accounts.participant_account;
    let clock = Clock::get()?;
    
    // Check pool hasn't started yet or is active
    require!(
        pool.pool_status == PoolStatus::Pending || pool.pool_status == PoolStatus::Active,
        ErrorCode::PoolNotActive
    );
    
    // Check pool isn't full
    require!(
        pool.participant_count < pool.max_participants,
        ErrorCode::PoolFull
    );
    
    // Transfer stake to pool vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.participant.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
            },
        ),
        pool.stake_amount,
    )?;
    
    // Initialize participant account (only money-related data)
    participant_account.pool = pool.key();
    participant_account.wallet = ctx.accounts.participant.key();
    participant_account.stake_amount = pool.stake_amount;
    participant_account.bump = ctx.bumps.participant_account;
    
    // Update pool
    pool.participant_count += 1;
    pool.total_staked += pool.stake_amount;
    
    // Start pool if it was pending
    if pool.pool_status == PoolStatus::Pending {
        pool.pool_status = PoolStatus::Active;
    }
    
    msg!("Participant {} joined pool {}", ctx.accounts.participant.key(), pool.pool_id);
    Ok(())
}


