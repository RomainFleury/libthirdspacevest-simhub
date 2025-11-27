# Build script for all Third Space Vest mods
# This script builds all mods in the repository: SUPERHOT VR, GTA V, Pistol Whip, and SimHub plugin
#
# Usage:
#   .\build-all-mods.ps1              # Build all mods
#   .\build-all-mods.ps1 -Mods superhot,gta5  # Build specific mods
#   .\build-all-mods.ps1 -Clean        # Clean before building

param(
    [Parameter()]
    [string[]]$Mods = @("superhot", "gta5", "pistolwhip", "simhub"),
    [switch]$Clean,
    [switch]$SkipPrerequisites
)

$ErrorActionPreference = "Stop"

Write-Host "=== Third Space Vest - Build All Mods ===" -ForegroundColor Cyan
Write-Host ""

# Define mod configurations
$modConfigs = @{
    "superhot" = @{
        Name = "SUPERHOT VR"
        Path = "superhot-mod"
        Solution = "ThirdSpace_SuperhotVR.sln"
        OutputDll = "ThirdSpace_SuperhotVR\bin\Release\ThirdSpace_SuperhotVR.dll"
        RequiresLibs = @("MelonLoader.dll", "0Harmony.dll", "Assembly-CSharp.dll", "UnityEngine.dll", "UnityEngine.CoreModule.dll")
        LibsSource = "SUPERHOT VR\MelonLoader\Managed\"
        BuildScript = $null
    }
    "gta5" = @{
        Name = "GTA V"
        Path = "gta5-mod"
        Solution = "ThirdSpaceGTAV.sln"
        OutputDll = "ThirdSpaceGTAV\bin\Release\ThirdSpaceGTAV.dll"
        RequiresLibs = @("ScriptHookVDotNet.dll", "GTA.dll")
        LibsSource = "Script Hook V .NET"
        BuildScript = "build.ps1"
    }
    "pistolwhip" = @{
        Name = "Pistol Whip"
        Path = "pistolwhip-mod"
        Solution = "ThirdSpace_PistolWhip.sln"
        OutputDll = "ThirdSpace_PistolWhip\bin\Release\ThirdSpace_PistolWhip.dll"
        RequiresLibs = @("MelonLoader.dll", "0Harmony.dll", "Il2Cppmscorlib.dll", "Il2CppUnityEngine.dll", "Assembly-CSharp.dll")
        LibsSource = "Pistol Whip\MelonLoader\Managed\"
        BuildScript = $null
    }
    "simhub" = @{
        Name = "SimHub Plugin"
        Path = "simhub-plugin"
        Solution = "ThirdSpaceSimHub.sln"
        OutputDll = "ThirdSpaceSimHub\bin\Release\ThirdSpaceSimHub.dll"
        RequiresLibs = @("GameReaderCommon.dll", "SimHub.Plugins.dll")
        LibsSource = "SimHub installation or libs folder"
        BuildScript = "build.ps1"
    }
}

# Find MSBuild
function Find-MSBuild {
    $paths = @(
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    return $null
}

# Check prerequisites
if (-not $SkipPrerequisites) {
    Write-Host "[Prerequisites] Checking build tools..." -ForegroundColor Yellow
    
    $msbuild = Find-MSBuild
    if (-not $msbuild) {
        Write-Host "  [FAIL] MSBuild not found! Please install Visual Studio 2019/2022" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] MSBuild found at $msbuild" -ForegroundColor Green
    Write-Host ""
}

# Build a single mod
function Build-Mod {
    param(
        [string]$ModKey,
        [hashtable]$Config,
        [string]$MSBuildPath
    )
    
    Write-Host "=== Building $($Config.Name) ===" -ForegroundColor Cyan
    Write-Host ""
    
    $modPath = $Config.Path
    if (-not (Test-Path $modPath)) {
        Write-Host "  [SKIP] Mod directory not found: $modPath" -ForegroundColor Yellow
        return $false
    }
    
    Push-Location $modPath
    
    try {
        # If mod has its own build script, use it
        if ($Config.BuildScript -and (Test-Path $Config.BuildScript)) {
            Write-Host "  [INFO] Using mod's build script: $($Config.BuildScript)" -ForegroundColor Cyan
            & ".\$($Config.BuildScript)"
            $result = $LASTEXITCODE -eq 0
        } else {
            # Use unified build process
            Write-Host "  [1/3] Checking solution file..." -ForegroundColor Yellow
            $solutionPath = $Config.Solution
            if (-not (Test-Path $solutionPath)) {
                Write-Host "  [FAIL] Solution file not found: $solutionPath" -ForegroundColor Red
                return $false
            }
            Write-Host "  [OK] Solution found" -ForegroundColor Green
            
            # Check for required DLLs (optional - just warn)
            Write-Host "  [2/3] Checking for required DLLs..." -ForegroundColor Yellow
            $libsDir = "libs"
            if (Test-Path $libsDir) {
                $missingDlls = @()
                foreach ($dll in $Config.RequiresLibs) {
                    if (-not (Test-Path "$libsDir\$dll")) {
                        $missingDlls += $dll
                    }
                }
                if ($missingDlls.Count -gt 0) {
                    Write-Host "  [WARN] Missing DLLs in libs folder:" -ForegroundColor Yellow
                    foreach ($dll in $missingDlls) {
                        Write-Host "    - $dll" -ForegroundColor Yellow
                    }
                    Write-Host "  [INFO] Copy DLLs from: $($Config.LibsSource)" -ForegroundColor Cyan
                    Write-Host "  [INFO] Continuing build anyway (MSBuild may handle references)" -ForegroundColor Cyan
                } else {
                    Write-Host "  [OK] All required DLLs found" -ForegroundColor Green
                }
            } else {
                Write-Host "  [WARN] libs folder not found - MSBuild will use project references" -ForegroundColor Yellow
            }
            
            # Clean if requested
            if ($Clean) {
                Write-Host "  [CLEAN] Cleaning previous build..." -ForegroundColor Yellow
                $cleanArgs = @(
                    $solutionPath,
                    "/t:Clean",
                    "/p:Configuration=Release",
                    "/v:minimal",
                    "/nologo"
                )
                & $MSBuildPath $cleanArgs | Out-Null
            }
            
            # Build
            Write-Host "  [3/3] Building (Release)..." -ForegroundColor Yellow
            $buildArgs = @(
                $solutionPath,
                "/p:Configuration=Release",
                "/p:Platform=AnyCPU",
                "/t:Build",
                "/v:minimal",
                "/nologo"
            )
            
            $buildResult = & $MSBuildPath $buildArgs 2>&1
            $buildExitCode = $LASTEXITCODE
            
            if ($buildExitCode -eq 0) {
                Write-Host "  [OK] Build successful!" -ForegroundColor Green
                
                # Verify output
                if (Test-Path $Config.OutputDll) {
                    $dllSize = (Get-Item $Config.OutputDll).Length
                    Write-Host "  [OK] DLL created: $($Config.OutputDll) ($([math]::Round($dllSize/1KB, 2)) KB)" -ForegroundColor Green
                    $result = $true
                } else {
                    Write-Host "  [WARN] DLL not found at expected path: $($Config.OutputDll)" -ForegroundColor Yellow
                    $result = $true  # Build succeeded, just output location differs
                }
            } else {
                Write-Host "  [FAIL] Build failed!" -ForegroundColor Red
                Write-Host $buildResult
                $result = $false
            }
        }
        
        Write-Host ""
        return $result
    } finally {
        Pop-Location
    }
}

# Main build process
$msbuild = Find-MSBuild
if (-not $msbuild) {
    Write-Host "ERROR: MSBuild not found! Please install Visual Studio 2019/2022" -ForegroundColor Red
    exit 1
}

$results = @{}
$totalMods = $Mods.Count
$currentMod = 0

foreach ($modKey in $Mods) {
    $currentMod++
    if (-not $modConfigs.ContainsKey($modKey)) {
        Write-Host "[WARN] Unknown mod: $modKey (skipping)" -ForegroundColor Yellow
        Write-Host ""
        continue
    }
    
    $config = $modConfigs[$modKey]
    Write-Host "[$currentMod/$totalMods] Building $($config.Name)..." -ForegroundColor Cyan
    Write-Host ""
    
    $success = Build-Mod -ModKey $modKey -Config $config -MSBuildPath $msbuild
    $results[$modKey] = $success
}

# Summary
Write-Host "=== Build Summary ===" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($modKey in $Mods) {
    if ($results.ContainsKey($modKey)) {
        $config = $modConfigs[$modKey]
        if ($results[$modKey]) {
            Write-Host "  [OK] $($config.Name)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  [FAIL] $($config.Name)" -ForegroundColor Red
            $failCount++
        }
    }
}

Write-Host ""
if ($failCount -eq 0) {
    Write-Host "=== All builds successful! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Built mods:" -ForegroundColor Cyan
    foreach ($modKey in $Mods) {
        if ($results.ContainsKey($modKey) -and $results[$modKey]) {
            $config = $modConfigs[$modKey]
            $dllPath = Join-Path $config.Path $config.OutputDll
            if (Test-Path $dllPath) {
                Write-Host "  - $($config.Name): $dllPath" -ForegroundColor White
            }
        }
    }
    exit 0
} else {
    Write-Host "=== Some builds failed ===" -ForegroundColor Red
    Write-Host "  Successful: $successCount" -ForegroundColor Green
    Write-Host "  Failed: $failCount" -ForegroundColor Red
    exit 1
}

