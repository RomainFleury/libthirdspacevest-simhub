# Setup Verification Script for Third Space Vest Project
# Checks all prerequisites and setup requirements

$ErrorActionPreference = "Continue"

Write-Host "=== Third Space Vest - Setup Verification ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Check Python
Write-Host "[1/7] Checking Python..." -ForegroundColor Yellow
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if ($python) {
    $version = & $python.Name --version 2>&1
    Write-Host "  [OK] Python found: $version" -ForegroundColor Green
    $pythonCmd = $python.Name
} else {
    Write-Host "  [FAIL] Python not found! Install from https://python.org/" -ForegroundColor Red
    $allGood = $false
    $pythonCmd = "python"
}

# 2. Check Python package installation
Write-Host ""
Write-Host "[2/7] Checking Python package installation..." -ForegroundColor Yellow
if ($python) {
    try {
        $result = & $pythonCmd -m modern_third_space.cli ping 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Python package installed and working" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Python package may not be installed" -ForegroundColor Yellow
            Write-Host "  Run: cd modern-third-space; pip install -e ." -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  [WARN] Could not verify Python package" -ForegroundColor Yellow
        Write-Host "  Run: cd modern-third-space; pip install -e ." -ForegroundColor Cyan
    }
} else {
    Write-Host "  [SKIP] Python not available" -ForegroundColor Yellow
}

# 3. Check Node.js
Write-Host ""
Write-Host "[3/7] Checking Node.js..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $version = & node --version
    Write-Host "  [OK] Node.js found: $version" -ForegroundColor Green
    
    # Check if version is v24+
    $majorVersion = [int]($version -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 24) {
        Write-Host "  [WARN] Node.js v24+ recommended (found v$majorVersion)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] Node.js not found! Install from https://nodejs.org/" -ForegroundColor Red
    $allGood = $false
}

# 4. Check Yarn/Corepack
Write-Host ""
Write-Host "[4/7] Checking Yarn..." -ForegroundColor Yellow
$yarn = Get-Command yarn -ErrorAction SilentlyContinue
if ($yarn) {
    $version = & yarn --version
    Write-Host "  [OK] Yarn found: $version" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Yarn not found" -ForegroundColor Yellow
    Write-Host "  Run: corepack enable" -ForegroundColor Cyan
}

# 5. Check nvm-windows (optional but recommended)
Write-Host ""
Write-Host "[5/7] Checking nvm-windows..." -ForegroundColor Yellow
$nvm = Get-Command nvm -ErrorAction SilentlyContinue
if ($nvm) {
    Write-Host "  [OK] nvm-windows found" -ForegroundColor Green
    try {
        $installed = nvm list 2>&1
        if ($installed -match "24\.11\.1") {
            Write-Host "  [OK] Node.js v24.11.1 is installed" -ForegroundColor Green
        } else {
            Write-Host "  [INFO] Consider installing Node.js v24.11.1: nvm install 24.11.1" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  [INFO] Could not check nvm versions" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [INFO] nvm-windows not found (optional, but recommended)" -ForegroundColor Yellow
    Write-Host "  Install from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Cyan
}

# 6. Check web dependencies
Write-Host ""
Write-Host "[6/7] Checking web dependencies..." -ForegroundColor Yellow
if (Test-Path "web\node_modules") {
    Write-Host "  [OK] web/node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  [WARN] web/node_modules not found" -ForegroundColor Yellow
    Write-Host "  Run: cd web; yarn install" -ForegroundColor Cyan
}

# 7. Check daemon status
Write-Host ""
Write-Host "[7/7] Checking daemon status..." -ForegroundColor Yellow
if ($python) {
    try {
        $status = & $pythonCmd -m modern_third_space.cli daemon status 2>&1
        if ($LASTEXITCODE -eq 0 -and $status -match "running|connected") {
            Write-Host "  [OK] Daemon is running" -ForegroundColor Green
        } else {
            Write-Host "  [INFO] Daemon is not running" -ForegroundColor Yellow
            Write-Host "  Start with: python -m modern_third_space.cli daemon start" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  [INFO] Could not check daemon status" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [SKIP] Python not available" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "Core prerequisites are installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Install Python package: cd modern-third-space; pip install -e ." -ForegroundColor White
    Write-Host "  2. Install web dependencies: cd web; yarn install" -ForegroundColor White
    Write-Host "  3. Start daemon: python -m modern_third_space.cli daemon start" -ForegroundColor White
    Write-Host "  4. Start Electron: cd web; yarn dev" -ForegroundColor White
} else {
    Write-Host "Some prerequisites are missing" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install the missing components and run this script again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed setup instructions, see:" -ForegroundColor Cyan
Write-Host "  - windows/SETUP.md (Windows quick setup)" -ForegroundColor White
Write-Host "  - README.md (General instructions)" -ForegroundColor White
Write-Host "  - BUILD.md (Building mods)" -ForegroundColor White
Write-Host ""
