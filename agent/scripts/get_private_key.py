#!/usr/bin/env python3
"""
Helper script to extract private key from Solana keypair file.
This is useful for setting AGENT_PRIVATE_KEY in deployment platforms.
"""

import json
import sys
from pathlib import Path

try:
    import base58
except ImportError:
    print("Error: base58 package not found. Install it with: pip install base58")
    sys.exit(1)


def get_private_key_from_keypair(keypair_path: str) -> str:
    """Extract base58 private key from Solana keypair file."""
    keypair_file = Path(keypair_path).expanduser()
    
    if not keypair_file.exists():
        print(f"Error: Keypair file not found at {keypair_path}")
        sys.exit(1)
    
    try:
        with open(keypair_file, 'r') as f:
            keypair = json.load(f)
        
        # Convert to bytes and encode as base58
        private_key_bytes = bytes(keypair)
        private_key_base58 = base58.b58encode(private_key_bytes).decode('utf-8')
        
        return private_key_base58
    
    except Exception as e:
        print(f"Error reading keypair file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        default_path = "~/.config/solana/id.json"
        print(f"Usage: python {sys.argv[0]} <keypair_path>")
        print(f"Example: python {sys.argv[0]} {default_path}")
        print(f"\nTrying default path: {default_path}")
        keypair_path = default_path
    else:
        keypair_path = sys.argv[1]
    
    private_key = get_private_key_from_keypair(keypair_path)
    
    print("\n" + "="*60)
    print("Your Agent Private Key (base58):")
    print("="*60)
    print(private_key)
    print("="*60)
    print("\n⚠️  SECURITY WARNING:")
    print("   - Keep this private key secure!")
    print("   - Never commit it to git!")
    print("   - Use it only in your deployment platform's environment variables")
    print("   - Set it as: AGENT_PRIVATE_KEY=" + private_key)
    print()
