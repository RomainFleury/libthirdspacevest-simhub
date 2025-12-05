# Build script for ThirdSpace_AmongUs BepInEx plugin
# Usage: .\build.ps1 [-Release]

param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"

$config = if ($Release) { "Release" } else { "Debug" }
$projectPath = Join-Path $PSScriptRoot "ThirdSpace_AmongUs\ThirdSpace_AmongUs.csproj"
$outputPath = Join-Path $PSScriptRoot "bin\$config"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Building ThirdSpace_AmongUs ($config)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check for dotnet
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: dotnet not found. Please install .NET 6.0 SDK." -ForegroundColor Red
    exit 1
}

# Set Among Us path if available (for reference resolution)
$steamPath = "C:\Program Files (x86)\Steam\steamapps\common\Among Us"
$epicPath = "C:\Program Files\Epic Games\AmongUs"

if (Test-Path $steamPath) {
    $env:AmongUsPath = $steamPath
    Write-Host "Found Among Us at: $steamPath" -ForegroundColor Green
} elseif (Test-Path $epicPath) {
    $env:AmongUsPath = $epicPath
    Write-Host "Found Among Us at: $epicPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: Among Us installation not found at default paths." -ForegroundColor Yellow
    Write-Host "Building without game references - you may need to add them manually." -ForegroundColor Yellow
}

# Build
Write-Host ""
Write-Host "Building project..." -ForegroundColor Cyan

try {
    dotnet build $projectPath -c $config -o $outputPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "Build successful!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output: $outputPath\ThirdSpace_AmongUs.dll" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Installation:" -ForegroundColor Yellow
        Write-Host "1. Copy ThirdSpace_AmongUs.dll to Among Us\BepInEx\plugins\" -ForegroundColor White
        Write-Host "2. Start the Python daemon: python -m modern_third_space.cli daemon start" -ForegroundColor White
        Write-Host "3. Launch Among Us" -ForegroundColor White
    } else {
        Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Build failed: $_" -ForegroundColor Red
    exit 1
}
