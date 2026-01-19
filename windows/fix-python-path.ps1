# Fix Python PATH for Third Space Vest
# This script adds Python to System PATH so batch files can find it
# Must be run as Administrator

#Requires -RunAsAdministrator

Write-Host "=== Fixing Python PATH ===" -ForegroundColor Cyan
Write-Host ""

# Find Python installation
$pythonPaths = @()
$possiblePaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python*",
    "$env:ProgramFiles\Python*",
    "C:\Python*"
)

foreach ($pattern in $possiblePaths) {
    $found = Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue | 
             Where-Object { Test-Path "$($_.FullName)\python.exe" } |
             Sort-Object Name -Descending |
             Select-Object -First 1
    
    if ($found) {
        $pythonDir = $found.FullName
        $pythonScripts = Join-Path $pythonDir "Scripts"
        
        if (Test-Path "$pythonDir\python.exe") {
            $version = & "$pythonDir\python.exe" --version 2>&1
            Write-Host "Found Python: $version at $pythonDir" -ForegroundColor Green
            $pythonPaths += $pythonDir
            if (Test-Path $pythonScripts) {
                $pythonPaths += $pythonScripts
            }
            break
        }
    }
}

if ($pythonPaths.Count -eq 0) {
    Write-Host "[ERROR] Python installation not found!" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

# Get current System PATH
$currentSystemPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$pathArray = $currentSystemPath -split ';' | Where-Object { $_ -ne '' }

# Check if Python is already in System PATH
$needsUpdate = $false
foreach ($pythonPath in $pythonPaths) {
    if ($pathArray -notcontains $pythonPath) {
        $needsUpdate = $true
        break
    }
}

if (-not $needsUpdate) {
    Write-Host "[OK] Python is already in System PATH" -ForegroundColor Green
} else {
    # Add Python paths to the beginning of System PATH
    $newPathArray = $pythonPaths + $pathArray
    $newSystemPath = $newPathArray -join ';'
    
    try {
        [Environment]::SetEnvironmentVariable('Path', $newSystemPath, 'Machine')
        Write-Host "[OK] Python added to System PATH" -ForegroundColor Green
        Write-Host ""
        Write-Host "Python paths added:" -ForegroundColor Cyan
        foreach ($path in $pythonPaths) {
            Write-Host "  - $path" -ForegroundColor White
        }
    } catch {
        Write-Host "[ERROR] Failed to update System PATH: $_" -ForegroundColor Red
        exit 1
    }
}

# Verify the fix
Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
Write-Host "Testing Python detection in new shell..." -ForegroundColor Yellow

# Refresh environment variables for current session
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

# Test with cmd.exe (like batch files do)
$cmdTest = cmd /c "where python 2>nul"
if ($cmdTest -and $cmdTest -notlike "*WindowsApps*") {
    Write-Host "[OK] Python is now found correctly: $cmdTest" -ForegroundColor Green
} elseif ($cmdTest -like "*WindowsApps*") {
    Write-Host "[WARN] Windows Store alias still takes precedence" -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Restart your computer, OR" -ForegroundColor White
    Write-Host "  2. Disable the Windows Store Python alias:" -ForegroundColor White
    Write-Host "     Settings > Apps > Advanced app settings > App execution aliases" -ForegroundColor White
    Write-Host "     Disable 'python.exe' and 'python3.exe'" -ForegroundColor White
} else {
    Write-Host "[WARN] Python not found. You may need to restart your terminal." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Please close and reopen your terminal/command prompt for changes to take effect." -ForegroundColor Yellow
Write-Host ""
