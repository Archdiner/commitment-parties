# Smart Contracts

Anchor program for Commitment Parties - trustless on-chain pool and participant management.

## Overview

Solana program that handles:
- Pool creation and configuration
- Participant staking and escrow
- Verification result storage
- Automatic reward distribution

## Setup

### Prerequisites

- Rust and Cargo
- Solana CLI
- Anchor Framework (via AVM)

### Installation

```bash
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify installation
anchor --version
```

### Configuration

1. Configure Solana CLI:
```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
```

2. Update `Anchor.toml` with your cluster and wallet settings

3. Update `src/lib.rs` with your program ID:
```rust
declare_id!("YourProgramIdHere");
```

## Building

```bash
cd programs/commitment-pool
anchor build
```

This generates:
- Program binary in `target/deploy/`
- TypeScript client in `target/types/`
- IDL in `target/idl/`

## Testing

```bash
anchor test
```

Runs both Rust unit tests and TypeScript integration tests.

## Deployment

### Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Mainnet

```bash
anchor deploy --provider.cluster mainnet
```

**Important**: Save the program ID after deployment:
```bash
solana address -k target/deploy/commitment_pool-keypair.json
```

Update this program ID in:
- Backend `.env` (`PROGRAM_ID`)
- Frontend `.env.local` (`NEXT_PUBLIC_PROGRAM_ID`)
- Agent `.env` (`PROGRAM_ID`)

## Program Structure

```
programs/commitment-pool/
├── src/
│   ├── lib.rs              # Program entry point
│   ├── state.rs            # Account structures
│   ├── errors.rs           # Custom error types
│   └── instructions/       # Instruction handlers
│       ├── create_pool.rs
│       ├── join_pool.rs
│       ├── verify.rs
│       └── distribute.rs
├── Anchor.toml             # Anchor configuration
└── Cargo.toml              # Rust dependencies
```

## Key Instructions

### `create_pool`
Initializes a new commitment pool with configuration.

**Accounts**:
- Pool PDA
- Vault PDA
- Creator wallet
- System program

### `join_pool`
Allows users to stake SOL and join a pool.

**Accounts**:
- Pool PDA
- Participant PDA
- Vault PDA
- User wallet
- System program

### `verify_participant`
Submits verification results (called by agent).

**Accounts**:
- Pool PDA
- Participant PDA
- Agent authority
- System program

### `distribute_rewards`
Settles pool and distributes rewards to winners.

**Accounts**:
- Pool PDA
- Vault PDA
- Agent authority
- System program

## Account Structure

### CommitmentPool
Stores pool configuration and state:
- Pool metadata (name, description, goal type)
- Stake amount and duration
- Start/end timestamps
- Participant count
- Distribution settings

### Participant
Tracks individual participant status:
- Wallet address
- Stake amount
- Verification status
- Progress tracking

### Vault (PDA)
Holds all staked SOL in escrow:
- Cannot be withdrawn by users
- Only agent can distribute
- Secured by program logic

## Security

- All stakes held in Program Derived Addresses (PDAs)
- No early withdrawal possible
- Transparent on-chain verification
- Authority checks for sensitive operations
- No reentrancy vulnerabilities (Solana's transaction model)

## Troubleshooting

### Build errors
- Ensure Rust is up to date: `rustup update`
- Check Anchor version: `anchor --version`
- Verify Solana CLI is installed: `solana --version`

### Deployment errors
- Check wallet has sufficient SOL: `solana balance`
- Verify cluster URL is correct: `solana config get`
- Ensure program ID matches in `lib.rs` and `Anchor.toml`

### Test failures
- Check local validator is running (if using localnet)
- Verify test accounts have sufficient SOL
- Check program is deployed before running tests
