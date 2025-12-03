# PowerShell script to run the social agent test with Python check

Write-Host "🤖 Testing Twitter/Blinks Social Agent" -ForegroundColor Cyan
Write-Host "=" * 50

# Check for Python
$pythonCmd = $null

# Try different Python commands
$pythonCommands = @("python", "python3", "py", "py -3")

foreach ($cmd in $pythonCommands) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $version -match "Python") {
            $pythonCmd = $cmd
            Write-Host "✅ Found Python: $version" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

if (-not $pythonCmd) {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python:" -ForegroundColor Yellow
    Write-Host "1. Download from https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "2. During installation, check 'Add Python to PATH'" -ForegroundColor White
    Write-Host "3. Restart your terminal and try again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or see docs/PYTHON_SETUP_WINDOWS.md for detailed instructions" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "test_social_agent.py")) {
    Write-Host "⚠️  test_social_agent.py not found in current directory" -ForegroundColor Yellow
    Write-Host "   Make sure you're in the agent/ directory" -ForegroundColor Yellow
    exit 1
}

# Run the test
Write-Host ""
Write-Host "Running test script..." -ForegroundColor Cyan
Write-Host ""

& $pythonCmd test_social_agent.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Test failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

