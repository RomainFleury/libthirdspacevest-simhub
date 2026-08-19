param(
    [switch]$Clean,
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$pluginName = "ThirdSpaceVestTelemetry"
$pluginPath = Join-Path $root $pluginName
$versionPath = Join-Path $root "version.txt"
$outputPath = Join-Path $root $OutputDir

if ($Clean -and (Test-Path $outputPath)) {
    Remove-Item -Recurse -Force $outputPath
}

$requiredFiles = @(
    "plugin.json",
    "README.md",
    "server\__init__.lua",
    "server\json.lua"
)

foreach ($relativePath in $requiredFiles) {
    $filePath = Join-Path $pluginPath $relativePath
    if (-not (Test-Path $filePath -PathType Leaf)) {
        throw "Required KYBER plugin file is missing: $relativePath"
    }
}

$manifestPath = Join-Path $pluginPath "plugin.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
if ($manifest.name -ne $pluginName) {
    throw "plugin.json name must be '$pluginName'"
}

if (-not (Test-Path $versionPath -PathType Leaf)) {
    throw "version.txt is missing"
}
$version = (Get-Content $versionPath | Select-Object -First 1).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
    throw "Invalid plugin version: $version"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$zipName = "thirdspace-vest-kyber-plugin-v$version.zip"
$zipPath = Join-Path $outputPath $zipName
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Compress-Archive -Path $pluginPath -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace("/", "\") })
    foreach ($relativePath in $requiredFiles) {
        $expected = "$pluginName\$relativePath"
        if ($entryNames -notcontains $expected) {
            throw "Built archive is missing: $expected"
        }
    }
} finally {
    $archive.Dispose()
}

$size = (Get-Item $zipPath).Length
Write-Host "[OK] KYBER plugin package: $zipPath ($size bytes)" -ForegroundColor Green
exit 0
