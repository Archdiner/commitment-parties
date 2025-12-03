# Python Setup for Windows

If you're getting "Python was not found" errors, you need to install Python properly.

## Quick Fix: Install Python from python.org

1. **Download Python:**
   - Go to https://www.python.org/downloads/
   - Download Python 3.11 or 3.12 (latest stable version)
   - Choose "Windows installer (64-bit)"

2. **Install Python:**
   - Run the installer
   - ✅ **IMPORTANT:** Check "Add Python to PATH" at the bottom
   - Click "Install Now"
   - Wait for installation to complete

3. **Verify Installation:**
   ```powershell
   python --version
   ```
   You should see something like: `Python 3.12.x`

4. **If still not working:**
   - Close and reopen your terminal/PowerShell
   - Or restart your computer

## Alternative: Use WSL2 (Recommended for this project)

Since this project uses Solana/Anchor (which work best on Linux), consider using WSL2:

1. **Install WSL2:**
   ```powershell
   wsl --install
   ```
   (Run PowerShell as Administrator)

2. **After restart, open Ubuntu terminal:**
   ```bash
   python3 --version
   ```

3. **Follow the Linux setup instructions in `docs/SETUP.md`**

## After Installing Python

Once Python is installed, set up the project:

```powershell
# Navigate to project
cd C:\Users\julia\OneDrive\Documents\commitment-parties

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
cd agent
pip install -r requirements.txt

# Now you can run the test
python test_social_agent.py
```

## Troubleshooting

### "python is not recognized"
- Make sure you checked "Add Python to PATH" during installation
- Restart your terminal
- Try using full path: `C:\Users\julia\AppData\Local\Programs\Python\Python312\python.exe`

### "Execution Policy" error in PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Still having issues?
- Check if Python is in PATH: `$env:PATH -split ';' | Select-String python`
- Reinstall Python and make sure to check "Add to PATH"
- Consider using WSL2 for better compatibility with Solana tools

