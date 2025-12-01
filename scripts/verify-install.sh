#!/bin/bash

# Verification script for Commitment Agent development environment
# Checks that all required tools are properly installed

echo "🔍 Verifying Commitment Agent Development Environment..."
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if command -v "$1" &> /dev/null; then
        VERSION=$($1 --version 2>&1 | head -n 1)
        echo -e "${GREEN}✅ $1 installed${NC}"
        echo "   Version: $VERSION"
        return 0
    else
        echo -e "${RED}❌ $1 not found${NC}"
        echo "   Please install $1 and ensure it's in your PATH"
        ((ERRORS++))
        return 1
    fi
}

check_python_package() {
    if python3 -c "import $1" 2>/dev/null; then
        VERSION=$(python3 -c "import $1; print($1.__version__)" 2>/dev/null || echo "installed")
        echo -e "${GREEN}✅ $1 installed${NC}"
        if [ "$VERSION" != "installed" ]; then
            echo "   Version: $VERSION"
        fi
        return 0
    else
        echo -e "${RED}❌ $1 not found${NC}"
        echo "   Install with: pip install $1"
        ((ERRORS++))
        return 1
    fi
}

# Check Rust
echo "Checking Rust installation..."
check_command "rustc"
check_command "cargo"
echo ""

# Check Solana CLI
echo "Checking Solana CLI..."
if check_command "solana"; then
    # Check Solana config
    SOLANA_URL=$(solana config get 2>/dev/null | grep "RPC URL" | awk '{print $3}')
    if [ -n "$SOLANA_URL" ]; then
        echo -e "${GREEN}   RPC URL: $SOLANA_URL${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Solana config not set${NC}"
        echo "   Run: solana config set --url https://api.devnet.solana.com"
        ((WARNINGS++))
    fi
    
    # Check for keypair
    if [ -f ~/.config/solana/id.json ]; then
        ADDRESS=$(solana address 2>/dev/null)
        if [ -n "$ADDRESS" ]; then
            echo -e "${GREEN}   Keypair found: $ADDRESS${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  No keypair found${NC}"
        echo "   Run: solana-keygen new --outfile ~/.config/solana/id.json"
        ((WARNINGS++))
    fi
fi
echo ""

# Check Anchor
echo "Checking Anchor framework..."
if check_command "anchor"; then
    ANCHOR_VERSION=$(anchor --version 2>&1 | awk '{print $2}')
    echo "   Anchor version: $ANCHOR_VERSION"
fi
echo ""

# Check Node.js
echo "Checking Node.js..."
check_command "node"
check_command "npm"
echo ""

# Check Python
echo "Checking Python..."
if check_command "python3"; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
    MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$MAJOR_VERSION" -lt 3 ] || ([ "$MAJOR_VERSION" -eq 3 ] && [ "$MINOR_VERSION" -lt 8 ]); then
        echo -e "${RED}   ⚠️  Python 3.8+ required (found $PYTHON_VERSION)${NC}"
        ((ERRORS++))
    fi
    
    # Check if virtual environment is activated
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "${GREEN}   ✅ Virtual environment activated${NC}"
        echo "   Path: $VIRTUAL_ENV"
    else
        echo -e "${YELLOW}   ⚠️  Virtual environment not activated${NC}"
        echo "   Run: source venv/bin/activate"
        ((WARNINGS++))
    fi
fi
echo ""

# Check Python packages
echo "Checking Python packages..."
if [ -n "$VIRTUAL_ENV" ] || python3 -c "import sys; sys.exit(0 if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) else 1)" 2>/dev/null; then
    check_python_package "solana"
    check_python_package "anchorpy"
    check_python_package "fastapi"
    check_python_package "uvicorn"
    check_python_package "supabase"
    check_python_package "pydantic"
    check_python_package "psycopg2"
    check_python_package "dotenv"
    check_python_package "schedule"
else
    echo -e "${YELLOW}   ⚠️  Skipping package checks (activate venv first)${NC}"
fi
echo ""

# Check PATH configuration
echo "Checking PATH configuration..."
if [[ ":$PATH:" == *":$HOME/.cargo/bin:"* ]]; then
    echo -e "${GREEN}✅ Rust/Cargo in PATH${NC}"
else
    echo -e "${YELLOW}⚠️  Rust/Cargo not in PATH${NC}"
    echo "   Add to ~/.zshrc: export PATH=\"\$HOME/.cargo/bin:\$PATH\""
    ((WARNINGS++))
fi

# Check Solana CLI - it might be installed via Homebrew or official installer
if command -v solana &> /dev/null; then
    SOLANA_PATH=$(which solana)
    if [[ "$SOLANA_PATH" == *"/opt/homebrew"* ]]; then
        echo -e "${GREEN}✅ Solana CLI in PATH (via Homebrew)${NC}"
    elif [[ "$SOLANA_PATH" == *".local/share/solana"* ]]; then
        echo -e "${GREEN}✅ Solana CLI in PATH (via official installer)${NC}"
    else
        echo -e "${GREEN}✅ Solana CLI in PATH${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Solana CLI not found in PATH${NC}"
    echo "   If installed via Homebrew, it should be in PATH automatically"
    echo "   If installed via official installer, add to ~/.zshrc:"
    echo "   export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""
    ((WARNINGS++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your environment is ready.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Environment mostly ready with $WARNINGS warning(s)${NC}"
    echo "   Review warnings above and fix as needed."
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "   Please fix the errors above before proceeding."
    exit 1
fi

