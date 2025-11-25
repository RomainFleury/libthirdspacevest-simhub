# Quick environment setup for development
# Run this script, then you can use yarn commands normally

$ErrorActionPreference = "Stop"

# Ensure C:\nvm4w\nodejs is first in the PATH
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

# Find nvm home
$nvmHome = [System.Environment]::GetEnvironmentVariable('NVM_HOME', 'User')
if (-not $nvmHome) {
    $possiblePaths = @("$env:LOCALAPPDATA\nvm", "$env:ProgramFiles\nvm", "$env:APPDATA\nvm")
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\nvm.exe") {
            $nvmHome = $path
            break
        }
    }
}

# Auto-detect nvm SYMLINK (Node.js bin dir) via registry (safe fallback)
$symlinkPath = $null
try {
    $regVal = (Get-ItemProperty -Path "HKCU:\Software\nvm" -ErrorAction Stop).SYMLINK
    if ($regVal) { $symlinkPath = $regVal }
} catch { }
if (-not $symlinkPath) {
    $symlinkPath = "C:\nvm4w\nodejs" # fallback
}

if ($nvmHome) {
    $env:NVM_HOME = $nvmHome
    $env:NVM_SYMLINK = $symlinkPath
    if ($env:PATH -notlike "*$nvmHome*") {
        $env:PATH = $nvmHome + ";" + $env:PATH
    }

    # Switch Node
    Push-Location $nvmHome
    & "$nvmHome\nvm.exe" use 24.11.1 2>&1 | Out-Null
    Pop-Location

    # Refresh PATH w/ detected symlink
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:PATH = $symlinkPath + ";" + $machinePath + ";" + $userPath
    if ($symlinkPath -and (Test-Path $symlinkPath)) {
        $env:PATH = $symlinkPath + ";" + $env:PATH
    }
}

# Robust need-to-exist check on node.exe
$nodeExePath = Join-Path $symlinkPath "node.exe"
if (-not (Test-Path $nodeExePath)) {
    Write-Host "ERROR! node.exe not found in $symlinkPath after nvm use!" -ForegroundColor Red
    Write-Host "Please check that Node.js is installed via nvm-windows and symlinked correctly." -ForegroundColor Red
    Write-Host "You can run 'nvm install 24.11.1' then 'nvm use 24.11.1', or check your NVM configuration."
    Write-Host "PATH is: $env:PATH" -ForegroundColor Yellow
    if (Test-Path $symlinkPath) { Get-ChildItem $symlinkPath | Write-Host }
    exit 1
}

try {
    $nodeResolved = (Get-Command node -ErrorAction Stop).Source
    Write-Host "node resolved to $nodeResolved" -ForegroundColor Cyan
} catch {
    Write-Host "node.exe still not found in PATH: $env:PATH" -ForegroundColor Red
    exit 1
}

# Remove old global Yarn from APPDATA npm if present
$npmYarn = Join-Path $env:APPDATA "npm\yarn.cmd"
if (Test-Path $npmYarn) {
    Remove-Item "$env:APPDATA\npm\yarn*" -Force -ErrorAction SilentlyContinue
}

# Enable Corepack, activate project Yarn version
& corepack enable 2>&1 | Out-Null
& corepack prepare yarn@stable --activate 2>&1 | Out-Null

Write-Host ("Environment ready! Node.js: {0}, Yarn: {1}" -f (node --version), (yarn --version)) -ForegroundColor Green
Write-Host "You can now run: yarn dev" -ForegroundColor Cyan

