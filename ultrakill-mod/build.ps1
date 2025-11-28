# Build script for ThirdSpace_ULTRAKILL BepInEx mod

param(
    [switch]$Release,
    [string]$GamePath = "",
    [switch]$Install
)

$ErrorActionPreference = "Stop"

Write-Host "=== Building ThirdSpace_ULTRAKILL ===" -ForegroundColor Cyan

# Find game path if not provided
if (-not $GamePath) {
    $possiblePaths = @(
        "C:\Program Files (x86)\Steam\steamapps\common\ULTRAKILL",
        "D:\Steam\steamapps\common\ULTRAKILL",
        "E:\Steam\steamapps\common\ULTRAKILL",
        "$env:ProgramFiles\Steam\steamapps\common\ULTRAKILL"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $GamePath = $path
            Write-Host "Found ULTRAKILL at: $GamePath" -ForegroundColor Green
            break
        }
    }
}

# Check for required libs
$libsPath = Join-Path $PSScriptRoot "ThirdSpace_ULTRAKILL\libs"
if (-not (Test-Path $libsPath)) {
    New-Item -ItemType Directory -Path $libsPath -Force | Out-Null
}

# Check if libs exist
$requiredLibs = @(
    "BepInEx.dll",
    "0Harmony.dll", 
    "UnityEngine.dll",
    "UnityEngine.CoreModule.dll",
    "UnityEngine.PhysicsModule.dll",
    "Assembly-CSharp.dll"
)

$missingLibs = @()
foreach ($lib in $requiredLibs) {
    if (-not (Test-Path (Join-Path $libsPath $lib))) {
        $missingLibs += $lib
    }
}

if ($missingLibs.Count -gt 0 -and $GamePath) {
    Write-Host "Copying required libraries..." -ForegroundColor Yellow
    
    # BepInEx libs
    $bepinexCore = Join-Path $GamePath "BepInEx\core"
    if (Test-Path $bepinexCore) {
        Copy-Item "$bepinexCore\BepInEx.dll" $libsPath -Force -ErrorAction SilentlyContinue
        Copy-Item "$bepinexCore\0Harmony.dll" $libsPath -Force -ErrorAction SilentlyContinue
    }
    
    # Game assemblies
    $managedPath = Join-Path $GamePath "ULTRAKILL_Data\Managed"
    if (Test-Path $managedPath) {
        Copy-Item "$managedPath\UnityEngine.dll" $libsPath -Force -ErrorAction SilentlyContinue
        Copy-Item "$managedPath\UnityEngine.CoreModule.dll" $libsPath -Force -ErrorAction SilentlyContinue
        Copy-Item "$managedPath\UnityEngine.PhysicsModule.dll" $libsPath -Force -ErrorAction SilentlyContinue
        Copy-Item "$managedPath\Assembly-CSharp.dll" $libsPath -Force -ErrorAction SilentlyContinue
    }
}

# Check again
$stillMissing = @()
foreach ($lib in $requiredLibs) {
    if (-not (Test-Path (Join-Path $libsPath $lib))) {
        $stillMissing += $lib
    }
}

if ($stillMissing.Count -gt 0) {
    Write-Host "Missing required libraries:" -ForegroundColor Red
    $stillMissing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please copy these files to: $libsPath" -ForegroundColor Yellow
    Write-Host "From:"
    Write-Host "  - BepInEx.dll, 0Harmony.dll: ULTRAKILL\BepInEx\core\"
    Write-Host "  - UnityEngine*.dll, Assembly-CSharp.dll: ULTRAKILL\ULTRAKILL_Data\Managed\"
    exit 1
}

# Build configuration
$config = if ($Release) { "Release" } else { "Debug" }

# Build
Write-Host "Building $config configuration..." -ForegroundColor Cyan
$projectPath = Join-Path $PSScriptRoot "ThirdSpace_ULTRAKILL\ThirdSpace_ULTRAKILL.csproj"

dotnet build $projectPath -c $config

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build succeeded!" -ForegroundColor Green

# Install to game if requested
if ($Install -and $GamePath) {
    $outputDll = Join-Path $PSScriptRoot "ThirdSpace_ULTRAKILL\bin\$config\net472\ThirdSpace_ULTRAKILL.dll"
    $pluginsPath = Join-Path $GamePath "BepInEx\plugins"
    
    if (Test-Path $outputDll) {
        if (-not (Test-Path $pluginsPath)) {
            Write-Host "BepInEx plugins folder not found. Run ULTRAKILL once with BepInEx installed." -ForegroundColor Yellow
        } else {
            Copy-Item $outputDll $pluginsPath -Force
            Write-Host "Installed to: $pluginsPath" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Output: ThirdSpace_ULTRAKILL\bin\$config\net472\ThirdSpace_ULTRAKILL.dll" -ForegroundColor Cyan
