# Build script for Third Space Vest SimHub Plugin
# This script automates the entire build process

$ErrorActionPreference = "Stop"

Write-Host "=== Third Space Vest SimHub Plugin Build ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check for SimHub installation (try multiple locations)
$simhubPath = $null
$possiblePaths = @(
    "C:\Program Files (x86)\SimHub",
    "$env:ProgramFiles\SimHub",
    "$env:ProgramFiles(x86)\SimHub",
    "$env:LOCALAPPDATA\Programs\SimHub"
)

foreach ($path in $possiblePaths) {
    if (Test-Path "$path\SimHub.exe") {
        $simhubPath = $path
        break
    }
}

if (-not $simhubPath) {
    Write-Host "  [WARN] SimHub not found in standard locations" -ForegroundColor Yellow
    Write-Host "  You can still build if SDK DLLs are in a 'libs' folder" -ForegroundColor Yellow
    $simhubPath = "C:\Program Files (x86)\SimHub"  # Default for SDK path
} else {
    Write-Host "  [OK] SimHub found at $simhubPath" -ForegroundColor Green
}

# Check for SimHub SDK DLLs (in SimHub install or libs folder)
$sdkFound = $false
if (Test-Path "$simhubPath\GameReaderCommon.dll" -and Test-Path "$simhubPath\SimHub.Plugins.dll") {
    $sdkFound = $true
    Write-Host "  [OK] SimHub SDK DLLs found in SimHub installation" -ForegroundColor Green
} elseif (Test-Path "libs\GameReaderCommon.dll" -and Test-Path "libs\SimHub.Plugins.dll") {
    $sdkFound = $true
    Write-Host "  [OK] SimHub SDK DLLs found in libs folder" -ForegroundColor Green
    $simhubPath = "libs"  # Use libs folder for SDK
} else {
    Write-Host "  [FAIL] SimHub SDK DLLs not found!" -ForegroundColor Red
    Write-Host "  Please either:" -ForegroundColor Yellow
    Write-Host "    1. Install SimHub, or" -ForegroundColor Yellow
    Write-Host "    2. Copy GameReaderCommon.dll and SimHub.Plugins.dll to a 'libs' folder" -ForegroundColor Yellow
    exit 1
}

# Set environment variable for build
$env:SIMHUB_PATH = $simhubPath
Write-Host "  [OK] Set SIMHUB_PATH=$simhubPath" -ForegroundColor Green

# Check for MSBuild
$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
if (-not (Test-Path $msbuild)) {
    $msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe"
}
if (-not (Test-Path $msbuild)) {
    $msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
}
if (-not (Test-Path $msbuild)) {
    $msbuild = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
}
if (-not (Test-Path $msbuild)) {
    $msbuild = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe"
}
if (-not (Test-Path $msbuild)) {
    Write-Host "ERROR: MSBuild not found! Please install Visual Studio 2019/2022" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] MSBuild found at $msbuild" -ForegroundColor Green

# Step 2: Restore NuGet packages
Write-Host ""
Write-Host "[2/6] Restoring NuGet packages..." -ForegroundColor Yellow

$nuget = "${env:ProgramFiles(x86)}\NuGet\nuget.exe"
if (-not (Test-Path $nuget)) {
    # Try to find nuget in PATH
    $nuget = (Get-Command nuget -ErrorAction SilentlyContinue).Source
    if (-not $nuget) {
        Write-Host "  [WARN] NuGet.exe not found, skipping package restore" -ForegroundColor Yellow
        Write-Host "  (MSBuild will restore packages automatically)" -ForegroundColor Yellow
    }
}

if ($nuget -and (Test-Path $nuget)) {
    Push-Location "ThirdSpaceSimHub"
    & $nuget restore packages.config -PackagesDirectory ..\packages
    Pop-Location
    Write-Host "  [OK] NuGet packages restored" -ForegroundColor Green
} else {
    Write-Host "  [WARN] NuGet restore skipped (MSBuild will handle it)" -ForegroundColor Yellow
}

# Step 3: Create libs folder and copy SDK DLLs (fallback if env var doesn't work)
Write-Host ""
Write-Host "[3/6] Setting up SDK references..." -ForegroundColor Yellow

$libsDir = "libs"
if (-not (Test-Path $libsDir)) {
    New-Item -ItemType Directory -Path $libsDir | Out-Null
}

Copy-Item "$simhubPath\GameReaderCommon.dll" "$libsDir\" -Force -ErrorAction SilentlyContinue
Copy-Item "$simhubPath\SimHub.Plugins.dll" "$libsDir\" -Force -ErrorAction SilentlyContinue

if (Test-Path "$libsDir\GameReaderCommon.dll") {
    Write-Host "  [OK] SDK DLLs copied to libs folder" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Could not copy SDK DLLs (will use SIMHUB_PATH env var)" -ForegroundColor Yellow
}

# Step 4: Build the solution
Write-Host ""
Write-Host "[4/6] Building plugin (Release)..." -ForegroundColor Yellow

$solutionPath = "ThirdSpaceSimHub.sln"
if (-not (Test-Path $solutionPath)) {
    Write-Host "ERROR: Solution file not found!" -ForegroundColor Red
    exit 1
}

$buildArgs = @(
    $solutionPath,
    "/p:Configuration=Release",
    "/p:Platform=AnyCPU",
    "/t:Build",
    "/v:minimal",
    "/nologo"
)

$buildResult = & $msbuild $buildArgs 2>&1
$buildExitCode = $LASTEXITCODE

if ($buildExitCode -eq 0) {
    Write-Host "  [OK] Build successful!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Build failed!" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}

# Step 5: Verify output
Write-Host ""
Write-Host "[5/6] Verifying build output..." -ForegroundColor Yellow

$dllPath = "ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll"
if (Test-Path $dllPath) {
    $dllSize = (Get-Item $dllPath).Length
    Write-Host "  [OK] DLL created: $dllPath ($([math]::Round($dllSize/1KB, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] DLL not found at $dllPath" -ForegroundColor Red
    exit 1
}

# Step 6: Install to SimHub (optional)
Write-Host ""
Write-Host "[6/6] Installation options..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Build complete! Next steps:" -ForegroundColor Green
Write-Host "  1. Copy the DLL to SimHub:" -ForegroundColor Cyan
Write-Host "     Copy-Item '$dllPath' '$simhubPath\'" -ForegroundColor White
Write-Host ""
Write-Host "  2. Restart SimHub" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. The plugin should appear in:" -ForegroundColor Cyan
Write-Host "     Settings -> Plugins -> Third Space Vest" -ForegroundColor White
Write-Host ""

# Ask if user wants to install automatically
$install = Read-Host "Install DLL to SimHub now? (Y/N)"
if ($install -eq "Y" -or $install -eq "y") {
    try {
        Copy-Item $dllPath "$simhubPath\ThirdSpaceSimHub.dll" -Force
        Write-Host "  [OK] DLL installed to SimHub!" -ForegroundColor Green
        Write-Host "  Please restart SimHub to load the plugin." -ForegroundColor Yellow
    } catch {
        Write-Host "  [FAIL] Failed to install: $_" -ForegroundColor Red
        Write-Host "  You can manually copy: $dllPath to $simhubPath\" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green

