# Windows Setup Script for libthirdspacevest-simhub
# This script sets up Node.js, Yarn, and installs dependencies

param(
    [switch]$SkipPythonCheck,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

if ($Help) {
    Write-Info @"
Windows Setup Script for libthirdspacevest-simhub

This script will:
  1. Check/install Node.js v25.2.1 using nvm-windows
  2. Enable Corepack for Yarn
  3. Install Node.js dependencies
  4. Optionally verify Python bridge setup

Usage:
  .\setup-windows.ps1                 # Full setup with Python check
  .\setup-windows.ps1 -SkipPythonCheck  # Skip Python verification
  .\setup-windows.ps1 -Help           # Show this help

Requirements:
  - nvm-windows must be installed (https://github.com/coreybutler/nvm-windows/releases)
  - Python 3.11+ (optional, for Python bridge)

"@
    exit 0
}

Write-Info "🚀 Starting Windows setup for libthirdspacevest-simhub..."
Write-Info ""

# Step 1: Check for nvm-windows
Write-Info "📦 Step 1: Checking nvm-windows installation..."

$nvmHome = [System.Environment]::GetEnvironmentVariable('NVM_HOME', 'User')
$nvmSymlink = [System.Environment]::GetEnvironmentVariable('NVM_SYMLINK', 'User')

if (-not $nvmHome) {
    # Try to find nvm in common locations
    $possiblePaths = @(
        "$env:LOCALAPPDATA\nvm",
        "$env:ProgramFiles\nvm",
        "$env:APPDATA\nvm"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\nvm.exe") {
            $nvmHome = $path
            break
        }
    }
}

if (-not $nvmHome -or -not (Test-Path "$nvmHome\nvm.exe")) {
    Write-Error "❌ nvm-windows not found!"
    Write-Warning ""
    Write-Warning "Please install nvm-windows first:"
    Write-Warning "  1. Download from: https://github.com/coreybutler/nvm-windows/releases"
    Write-Warning "  2. Run nvm-setup.exe"
    Write-Warning "  3. Restart PowerShell and run this script again"
    Write-Warning ""
    exit 1
}

Write-Success "✓ Found nvm-windows at: $nvmHome"

# Set environment variables for this session
$env:NVM_HOME = $nvmHome
if ($nvmSymlink) {
    $env:NVM_SYMLINK = $nvmSymlink
} else {
    $env:NVM_SYMLINK = "C:\Program Files\nodejs"
}

# Add nvm to PATH for this session
if ($env:PATH -notlike "*$nvmHome*") {
    $env:PATH = "$nvmHome;$env:PATH"
}

# Step 2: Install/Use Node.js v25.2.1
Write-Info ""
Write-Info "📦 Step 2: Setting up Node.js v25.2.1..."

$requiredVersion = "25.2.1"
$nvmExe = "$nvmHome\nvm.exe"

# Change to nvm directory to avoid path resolution issues
Push-Location $nvmHome

try {
    # Check if version is already installed
    $installedVersions = & $nvmExe list 2>&1
    $versionInstalled = $installedVersions -match "v$requiredVersion"
    
    if ($versionInstalled) {
        Write-Success "✓ Node.js v$requiredVersion is already installed"
    } else {
        Write-Info "   Installing Node.js v$requiredVersion..."
        & $nvmExe install $requiredVersion
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Node.js v$requiredVersion"
        }
        Write-Success "✓ Node.js v$requiredVersion installed successfully"
    }
    
    # Use the required version
    Write-Info "   Switching to Node.js v$requiredVersion..."
    & $nvmExe use $requiredVersion
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to switch to Node.js v$requiredVersion"
    }
    Write-Success "✓ Now using Node.js v$requiredVersion"
    
} finally {
    Pop-Location
}

# Refresh PATH to include Node.js
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if ($env:NVM_SYMLINK -and (Test-Path $env:NVM_SYMLINK)) {
    $env:PATH = "$env:NVM_SYMLINK;$env:PATH"
}

# Verify Node.js is available
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Node.js is not available in PATH"
    Write-Warning "   You may need to restart PowerShell or manually add Node.js to PATH"
    exit 1
}

if ($nodeVersion -notmatch "v$requiredVersion") {
    Write-Warning "⚠️  Node.js version mismatch: expected v$requiredVersion, got $nodeVersion"
    Write-Warning "   Continuing anyway..."
} else {
    Write-Success "✓ Node.js version verified: $nodeVersion"
}

# Step 3: Enable Corepack
Write-Info ""
Write-Info "📦 Step 3: Enabling Corepack for Yarn..."

& corepack enable
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to enable Corepack"
    exit 1
}
Write-Success "✓ Corepack enabled"

# Verify Yarn is available
$yarnVersion = & yarn --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Yarn is not available"
    exit 1
}
Write-Success "✓ Yarn version: $yarnVersion"

# Step 4: Install dependencies
Write-Info ""
Write-Info "📦 Step 4: Installing Node.js dependencies..."

# $PSScriptRoot is now windows/, so go up one level to project root
$projectRoot = Split-Path $PSScriptRoot -Parent
$webDir = Join-Path $projectRoot "web"
if (-not (Test-Path $webDir)) {
    Write-Error "❌ web/ directory not found. Are you running this from the project root?"
    exit 1
}

Push-Location $webDir

try {
    Write-Info "   Running yarn install (this may take a few minutes)..."
    & yarn install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install dependencies"
    }
    Write-Success "✓ Dependencies installed successfully"
} finally {
    Pop-Location
}

# Step 5: Optional Python check
if (-not $SkipPythonCheck) {
    Write-Info ""
    Write-Info "📦 Step 5: Checking Python bridge setup (optional)..."
    
    Push-Location $webDir
    try {
        & yarn check:python
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Python bridge check completed"
        } else {
            Write-Warning "⚠️  Python bridge check had warnings (this is OK if Python isn't set up yet)"
        }
    } catch {
        Write-Warning "⚠️  Could not run Python check: $_"
        Write-Warning "   You can set up Python later. See README.md for instructions."
    } finally {
        Pop-Location
    }
}

# Summary
Write-Info ""
Write-Success "✅ Setup complete!"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. To start the debugger: cd web && yarn dev"
Write-Info "  2. To verify Python setup: cd web && yarn check:python"
Write-Info ""
Write-Info "Note: If you restart PowerShell, you may need to run:"
Write-Info "  nvm use 25.2.1"
Write-Info "  (or add nvm to your PATH permanently)"
Write-Info ""

