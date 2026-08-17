$ErrorActionPreference = "Stop"
Write-Host "=== Third Space Vest Battle Sister Mod Build ===" -ForegroundColor Cyan

$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
if (-not (Test-Path $msbuild)) { $msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe" }
if (-not (Test-Path $msbuild)) { $msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe" }
if (-not (Test-Path $msbuild)) { $msbuild = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe" }
if (-not (Test-Path $msbuild)) {
    Write-Host "ERROR: MSBuild not found" -ForegroundColor Red
    exit 1
}

$libsDir = "libs"
if (-not (Test-Path $libsDir)) { New-Item -ItemType Directory -Path $libsDir | Out-Null }
$requiredDlls = @(
    "MelonLoader.dll",
    "0Harmony.dll",
    "Il2Cppmscorlib.dll",
    "Il2CppUnityEngine.dll",
    "UnityEngine.CoreModule.dll",
    "UnityEngine.PhysicsModule.dll",
    "Assembly-CSharp.dll"
)
$missing = @()
foreach ($dll in $requiredDlls) {
    if (-not (Test-Path "$libsDir\$dll")) { $missing += $dll }
}
if ($missing.Count -gt 0) {
    Write-Host "Missing DLLs in libs/ (copy from Battle Sister MelonLoader folders):" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" }
}

& $msbuild "ThirdSpace_BattleSister.sln" /p:Configuration=Release /p:Platform=AnyCPU /t:Build /v:minimal /nologo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$dllPath = "ThirdSpace_BattleSister\bin\Release\ThirdSpace_BattleSister.dll"
if (-not (Test-Path $dllPath)) {
    Write-Host "ERROR: DLL not found at $dllPath" -ForegroundColor Red
    exit 1
}
Write-Host "Built $dllPath" -ForegroundColor Green
Write-Host "Copy to Battle Sister\Mods\ then start the daemon."
