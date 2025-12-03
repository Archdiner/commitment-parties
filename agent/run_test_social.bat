@echo off
REM Batch script to run the social agent test with Python check

echo 🤖 Testing Twitter/Blinks Social Agent
echo ==================================================

REM Check for Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Found Python
    python --version
    echo.
    echo Running test script...
    echo.
    python test_social_agent.py
    exit /b %errorlevel%
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Found Python3
    python3 --version
    echo.
    echo Running test script...
    echo.
    python3 test_social_agent.py
    exit /b %errorlevel%
)

echo ❌ Python not found!
echo.
echo Please install Python:
echo 1. Download from https://www.python.org/downloads/
echo 2. During installation, check 'Add Python to PATH'
echo 3. Restart your terminal and try again
echo.
echo Or see docs/PYTHON_SETUP_WINDOWS.md for detailed instructions
exit /b 1

