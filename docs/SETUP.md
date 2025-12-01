# Development Environment Setup Guide

Complete step-by-step guide to set up your development environment for Commitment Agent.

## Prerequisites Checklist

Before starting, ensure you have:
- macOS (this guide is optimized for macOS with zsh)
- Homebrew installed (for Node.js if needed)
- Terminal access
- Internet connection

## Step 1: Install Rust & Cargo

Rust is required for building Solana smart contracts with Anchor.

### Installation

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the prompts. The installer will configure Rust for you.

### Add to PATH

Add Rust to your PATH by adding this line to `~/.zshrc`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Reload your shell configuration:

```bash
source ~/.zshrc
```

### Verify Installation

```bash
rustc --version
cargo --version
```

You should see version numbers for both commands.

## Step 2: Install Solana CLI

The Solana CLI is essential for interacting with the Solana network, deploying programs, and managing wallets.

### Installation

**Option 1: Homebrew (Recommended for macOS, especially if curl SSL fails)**

```bash
brew install solana
```

Homebrew automatically adds Solana to your PATH, so no manual PATH configuration needed.

**Option 2: Official Installer**

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

If you get SSL errors with curl, use Option 1 (Homebrew) instead.

### Add to PATH (Only if using Option 2)

If you used the official installer, add Solana CLI to your PATH by adding this line to `~/.zshrc`:

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Reload your shell configuration:

```bash
source ~/.zshrc
```

### Verify Installation

```bash
solana --version
```

### Configure for Devnet

```bash
solana config set --url https://api.devnet.solana.com
```

### Generate Development Keypair

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

This creates a new keypair for development. **Never commit this file to git!**

### Get Your Address

```bash
solana address
```

Save this address - you'll need it for airdrops.

### Airdrop Test SOL

Get free test SOL for development:

```bash
solana airdrop 2
```

If you need more, you can repeat this command (there's a limit per day).

## Step 3: Install Anchor Framework

Anchor is the framework we use to build Solana smart contracts.

### Install AVM (Anchor Version Manager)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

This may take several minutes. AVM allows you to manage multiple Anchor versions.

### Install Latest Anchor

```bash
avm install latest
avm use latest
```

### Verify Installation

```bash
anchor --version
```

You should see the Anchor version number.

## Step 4: Install Node.js & npm

Node.js is needed for Anchor tests and the frontend.

### Check if Already Installed

```bash
node --version
npm --version
```

If both commands show version numbers, you're good to go!

### Install via Homebrew (if needed)

```bash
brew install node
```

### Verify Installation

```bash
node --version
npm --version
```

## Step 5: Setup Python Environment

We use Python for both the FastAPI backend and the AI agent.

### Verify Python Version

```bash
python3 --version
```

You need Python 3.8 or higher. macOS typically comes with Python 3.x.

### Create Virtual Environment

Navigate to the project root:

```bash
cd /Users/asadr/Desktop/personalProjects/commitment-parties
python3 -m venv venv
```

### Activate Virtual Environment

```bash
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

**Important:** Always activate the virtual environment before working on the project.

### Install Python Packages

```bash
pip install --upgrade pip
pip install solana anchorpy fastapi "uvicorn[standard]" psycopg2-binary python-dotenv supabase schedule pydantic
```

**Note for zsh users**: The square brackets in `uvicorn[standard]` must be quoted, otherwise zsh will interpret them as glob patterns. Use quotes: `"uvicorn[standard]"`.

This installs all required Python dependencies:
- `solana` - Solana Python SDK
- `anchorpy` - Python client for Anchor programs
- `fastapi` - Web framework for the backend
- `uvicorn[standard]` - ASGI server for FastAPI
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Environment variable management
- `supabase` - Supabase Python client
- `schedule` - Task scheduling for the agent
- `pydantic` - Data validation

### Verify Python Packages

```bash
pip list | grep -E "solana|anchorpy|fastapi|uvicorn|supabase"
```

You should see all packages listed.

## Step 6: Verify Complete Installation

Run the verification script:

```bash
chmod +x scripts/verify-install.sh
./scripts/verify-install.sh
```

This script checks that all tools are properly installed and configured.

## First-Time Setup Checklist

After completing all steps above:

- [ ] Rust and Cargo installed and in PATH
- [ ] Solana CLI installed and in PATH
- [ ] Solana CLI configured for devnet
- [ ] Development keypair generated
- [ ] Test SOL airdropped (at least 2 SOL)
- [ ] Anchor framework installed via AVM
- [ ] Node.js and npm installed
- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] All Python packages installed
- [ ] Verification script passes all checks

## Troubleshooting

### PATH Issues

If commands like `solana` or `cargo` are not found after installation:

1. Check if the PATH export is in `~/.zshrc`:
   ```bash
   cat ~/.zshrc | grep -E "cargo|solana"
   ```

2. Reload your shell:
   ```bash
   source ~/.zshrc
   ```

3. If still not working, check the actual installation paths:
   ```bash
   ls -la ~/.cargo/bin
   ls -la ~/.local/share/solana/install/active_release/bin
   ```

### Solana Installation SSL Errors

If you get `curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL` when installing Solana:

**Solution**: Use Homebrew instead:
```bash
brew install solana
```

This is a common issue on macOS with LibreSSL. Homebrew handles SSL connections more reliably.

### Solana Airdrop Fails

If airdrop fails with "insufficient funds" or rate limit:

- Wait a few minutes and try again
- Use a different RPC endpoint (some have higher limits)
- Check your balance: `solana balance`

### Anchor Installation Issues

If `cargo install` fails:

- Ensure Rust is properly installed: `rustc --version`
- Try updating Rust: `rustup update`
- Check internet connection (installation downloads large files)

### Python Virtual Environment Issues

If `python3 -m venv` fails:

- Ensure Python 3.8+ is installed: `python3 --version`
- Try using `python` instead of `python3`
- On some systems, you may need: `python3 -m pip install --user virtualenv`

### Port Conflicts

If you encounter port conflicts:

- Solana local validator uses port 8899
- FastAPI backend uses port 8000 (configurable)
- Check what's using ports: `lsof -i :8899` or `lsof -i :8000`

## Next Steps

Once your environment is set up:

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
2. Follow the project README to build and deploy smart contracts
3. Set up Supabase database (see [DEPLOYMENT.md](DEPLOYMENT.md))
4. Configure environment variables (see `.env.example` files)

## Getting Help

If you encounter issues not covered here:

1. Check the [Solana Documentation](https://docs.solana.com/)
2. Check the [Anchor Documentation](https://www.anchor-lang.com/)
3. Review error messages carefully - they often contain helpful information
4. Check GitHub issues for common problems

## PATH Configuration Summary

Add these lines to your `~/.zshrc` file:

```bash
# Rust/Cargo
export PATH="$HOME/.cargo/bin:$PATH"

# Solana CLI
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

After adding, reload:

```bash
source ~/.zshrc
```

