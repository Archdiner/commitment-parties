use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Pool is not active")]
    PoolNotActive,
    
    #[msg("Pool is full")]
    PoolFull,
    
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    
    #[msg("Pool has already ended")]
    PoolAlreadyEnded,
    
    #[msg("Unauthorized action")]
    Unauthorized,
    
    #[msg("Pool has not ended yet")]
    PoolNotEnded,
    
    #[msg("Participant not found")]
    ParticipantNotFound,
    
    #[msg("Invalid day number")]
    InvalidDay,
    
    #[msg("No winners to distribute rewards to")]
    NoWinners,
}


