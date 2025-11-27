# Build script for Third Space Vest GTA V Mod
# This script automates the build process

$ErrorActionPreference = "Stop"

Write-Host "=== Third Space Vest GTA V Mod Build ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow

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

# Step 2: Check for Script Hook V .NET DLLs
Write-Host ""
Write-Host "[2/4] Checking for Script Hook V .NET DLLs..." -ForegroundColor Yellow

$libsDir = "libs"
if (-not (Test-Path $libsDir)) {
    New-Item -ItemType Directory -Path $libsDir | Out-Null
}

$requiredDlls = @("ScriptHookVDotNet.dll", "GTA.dll")
$missingDlls = @()

foreach ($dll in $requiredDlls) {
    if (-not (Test-Path "$libsDir\$dll")) {
        $missingDlls += $dll
    }
}

if ($missingDlls.Count -gt 0) {
    Write-Host "  [WARN] Missing DLLs in libs folder:" -ForegroundColor Yellow
    foreach ($dll in $missingDlls) {
        Write-Host "    - $dll" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  Please copy Script Hook V .NET DLLs to libs folder:" -ForegroundColor Yellow
    Write-Host "    1. Download Script Hook V .NET from:" -ForegroundColor White
    Write-Host "       https://github.com/crosire/scripthookvdotnet" -ForegroundColor White
    Write-Host "    2. Extract ScriptHookVDotNet.dll and GTA.dll" -ForegroundColor White
    Write-Host "    3. Copy them to: $libsDir\" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (Y/N)"
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "  [OK] All required DLLs found" -ForegroundColor Green
}

# Step 3: Build the solution
Write-Host ""
Write-Host "[3/4] Building mod (Release)..." -ForegroundColor Yellow

$solutionPath = "ThirdSpaceGTAV.sln"
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

# Step 4: Verify output
Write-Host ""
Write-Host "[4/4] Verifying build output..." -ForegroundColor Yellow

$dllPath = "ThirdSpaceGTAV\bin\Release\ThirdSpaceGTAV.dll"
if (Test-Path $dllPath) {
    $dllSize = (Get-Item $dllPath).Length
    Write-Host "  [OK] DLL created: $dllPath ($([math]::Round($dllSize/1KB, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] DLL not found at $dllPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Copy the DLL to GTA V:" -ForegroundColor White
Write-Host "     Copy-Item '$dllPath' 'C:\path\to\GTA V\scripts\'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start the Python daemon:" -ForegroundColor White
Write-Host "     python3 -m modern_third_space.cli daemon start" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Launch GTA V" -ForegroundColor White
Write-Host ""

