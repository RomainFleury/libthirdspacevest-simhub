# Windows Development Script for libthirdspacevest-simhub
# This script sets up the environment and runs the dev server

$ErrorActionPreference = "Stop"

# -------- PATH FIX to ensure correct Yarn/Corepack version ---------
$nodejsPath = "C:\nvm4w\nodejs"
$appdataNpm = [System.IO.Path]::Combine($env:USERPROFILE, "AppData", "Roaming", "npm")
$originalPath = $env:PATH -split ';' | Where-Object { $_ -and ($_ -ne '') }
$newPath = @()
$addedNodejs = $false
foreach ($part in $originalPath) {
    if ($part -like "*nvm4w\\nodejs*" -and -not $addedNodejs) {
        $newPath += $nodejsPath
        $addedNodejs = $true
    } elseif ($part -like "*yarn*" -or $part -like "*npm*" -or $part -like "*AppData*Roaming*npm*") {
        continue
    } else {
        $newPath += $part
    }
}
$newPath += $appdataNpm
$env:PATH = ($newPath -join ';')
# -------- END PATH FIX ---------------------------------------------

# Colors for output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "Starting development environment..."
Write-Info ""

# Step 1: Setup nvm-windows environment
Write-Info "Setting up Node.js environment..."

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
    Write-Error "nvm-windows not found!"
    Write-Warning "Please run .\setup-windows.ps1 first to set up the environment."
    exit 1
}

# Set environment variables for this session
$env:NVM_HOME = $nvmHome
if ($nvmSymlink) {
    $env:NVM_SYMLINK = $nvmSymlink
} else {
    $env:NVM_SYMLINK = "C:\Program Files\nodejs"
}

# Add nvm to PATH for this session
if ($env:PATH -notlike "*$nvmHome*") {
    $env:PATH = $nvmHome + ";" + $env:PATH
}

# Step 2: Switch to Node.js v25.2.1
Write-Info "Switching to Node.js v25.2.1..."

$requiredVersion = "25.2.1"
$nvmExe = "$nvmHome\nvm.exe"

# Change to nvm directory to avoid path resolution issues
Push-Location $nvmHome
try {
    $useOutput = & $nvmExe use $requiredVersion 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not switch to Node.js v$requiredVersion, trying to install..."
        & $nvmExe install $requiredVersion 2>&1 | Out-Null
        $useOutput = & $nvmExe use $requiredVersion 2>&1
    }
} finally {
    Pop-Location
}

# Get the actual Node.js symlink path from nvm
if (-not $nvmSymlink) {
    $nvmSymlink = [System.Environment]::GetEnvironmentVariable('NVM_SYMLINK', 'User')
}
if (-not $nvmSymlink) {
    # Try common nvm-windows symlink locations
    $possibleSymlinks = @(
        "C:\nvm4w\nodejs",
        "C:\Program Files\nodejs"
    )
    foreach ($symlink in $possibleSymlinks) {
        if (Test-Path $symlink) {
            $nvmSymlink = $symlink
            break
        }
    }
}

# Refresh PATH - put Node.js symlink FIRST so it takes precedence
if ($nvmSymlink -and (Test-Path $nvmSymlink)) {
    $env:NVM_SYMLINK = $nvmSymlink
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:PATH = $nvmSymlink + ";" + $machinePath + ";" + $userPath
}

# ----- NEW ROBUST NODE CHECK ------
$nodeExePath = Join-Path $env:NVM_SYMLINK "node.exe"
if (-not (Test-Path $nodeExePath)) {
    Write-Error "ERROR! node.exe not found in $env:NVM_SYMLINK after nvm use!"
    Write-Host "Contents of $env:NVM_SYMLINK:" -ForegroundColor Yellow
    Get-ChildItem $env:NVM_SYMLINK | Write-Host
    Write-Host "PATH is: $env:PATH" -ForegroundColor Yellow
    exit 1
}
try {
    $nodeResolved = (Get-Command node -ErrorAction Stop).Source
    Write-Host "node resolved to $nodeResolved" -ForegroundColor Cyan
} catch {
    Write-Error "node.exe still not found in PATH: $env:PATH"
    Write-Host "Contents of $env:NVM_SYMLINK:" -ForegroundColor Yellow
    Get-ChildItem $env:NVM_SYMLINK | Write-Host
    exit 1
}
# -----------------------------------

# Remove old global Yarn from APPDATA npm if present
$npmYarn = Join-Path $env:APPDATA "npm\yarn.cmd"
if (Test-Path $npmYarn) {
    Remove-Item "$env:APPDATA\npm\yarn*" -Force -ErrorAction SilentlyContinue
}

# Enable Corepack, activate project Yarn version
& corepack enable 2>&1 | Out-Null
& corepack prepare yarn@stable --activate 2>&1 | Out-Null

# Step 3: Verify Yarn
$yarnVersion = & yarn --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Yarn is not available"
    exit 1
}
Write-Success "Yarn $yarnVersion"

# Step 4: Navigate to web directory
# $PSScriptRoot is now windows/, so go up one level to project root
$projectRoot = Split-Path $PSScriptRoot -Parent
$webDir = Join-Path $projectRoot "web"
if (-not (Test-Path $webDir)) {
    Write-Error "web/ directory not found. Are you running this from the project root?"
    exit 1
}

Push-Location $webDir

# Step 5: Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Warning "Dependencies not found. Installing..."
    & yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        Pop-Location
        exit 1
    }
    Write-Success "Dependencies installed"
}

# Step 6: Start the dev server
Write-Info ""
Write-Success "Environment ready!"
Write-Info ""
Write-Info "Starting development server..."
Write-Info "  - Vite dev server will start on http://localhost:5173"
Write-Info "  - Electron window will open automatically"
Write-Info ""
Write-Warning "Press Ctrl+C to stop the dev server"
Write-Info ""

# Run the dev command
try {
    & yarn dev
} catch {
    Write-Error "Failed to start dev server: $_"
    Pop-Location
    exit 1
} finally {
    Pop-Location
}
