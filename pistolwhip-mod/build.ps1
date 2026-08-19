# Build ThirdSpace_PistolWhip.dll against MelonLoader 0.7 net6 (Il2Cpp).
# Usage:
#   ./build.ps1
#   ./build.ps1 -GameDir "F:\SteamLibrary\steamapps\common\Pistol Whip"

param(
    [string]$GameDir = ""
)

$ErrorActionPreference = "Stop"
$modRoot = $PSScriptRoot
Set-Location $modRoot

Write-Host "=== Third Space Vest Pistol Whip Mod Build ===" -ForegroundColor Cyan

if (-not $GameDir) {
    $candidates = @(
        "F:\SteamLibrary\steamapps\common\Pistol Whip",
        "C:\Program Files (x86)\Steam\steamapps\common\Pistol Whip"
    )
    foreach ($c in $candidates) {
        if (Test-Path (Join-Path $c "Pistol Whip.exe")) { $GameDir = $c; break }
    }
}

$melonDll = if ($GameDir) { Join-Path $GameDir "MelonLoader\net6\MelonLoader.dll" } else { Join-Path $modRoot "libs\MelonLoader.dll" }
if (-not (Test-Path $melonDll)) {
    Write-Host "ERROR: MelonLoader.net6 not found." -ForegroundColor Red
    Write-Host "Install MelonLoader 0.6+ into Pistol Whip, then pass -GameDir to this script." -ForegroundColor Yellow
    exit 1
}

$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
    Write-Host "ERROR: .NET SDK not found. Install .NET 6 or 8 SDK, then retry." -ForegroundColor Red
    exit 1
}

$csproj = Join-Path $modRoot "ThirdSpace_PistolWhip\ThirdSpace_PistolWhip.csproj"
$buildArgs = @("build", $csproj, "-c", "Release", "--nologo")
if ($GameDir) {
    $buildArgs += "/p:PistolWhipDir=$GameDir"
}

Write-Host "Building with $melonDll"
& dotnet @buildArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$dllPath = Join-Path $modRoot "ThirdSpace_PistolWhip\bin\Release\ThirdSpace_PistolWhip.dll"
if (-not (Test-Path $dllPath)) {
    Write-Host "ERROR: DLL not found at $dllPath" -ForegroundColor Red
    exit 1
}

$destDir = Join-Path $modRoot "..\mods\pistolwhip"
New-Item -ItemType Directory -Path $destDir -Force | Out-Null
Copy-Item $dllPath (Join-Path $destDir "ThirdSpace_PistolWhip.dll") -Force
Write-Host "Built $dllPath" -ForegroundColor Green
Write-Host "Copied to mods/pistolwhip/ThirdSpace_PistolWhip.dll" -ForegroundColor Green
