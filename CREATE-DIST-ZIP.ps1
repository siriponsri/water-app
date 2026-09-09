[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$releaseRoot = Join-Path $projectRoot 'release'
$packageName = 'ANF3-Laboratory-Records-' + (Get-Date -Format 'yyyyMMdd')
$stageRoot = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot ($packageName + '.zip')
$shaPath = $zipPath + '.sha256'

function Assert-UnderRelease([string]$Path) {
    $resolved = [IO.Path]::GetFullPath($Path)
    $prefix = [IO.Path]::GetFullPath($releaseRoot) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside release/: $resolved"
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
    throw 'dist/index.html is missing. Run: rtk pnpm build'
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
Assert-UnderRelease $stageRoot
Assert-UnderRelease $zipPath
Assert-UnderRelease $shaPath

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $shaPath) {
    Remove-Item -LiteralPath $shaPath -Force
}
New-Item -ItemType Directory -Path $stageRoot | Out-Null

$excludedTopLevel = @(
    '.codex',
    '.git',
    '.playwright-cli',
    '.pytest_cache',
    '.tools',
    '.uv-cache',
    '.venv',
    'node_modules',
    'output',
    'pdfs',
    'python',
    'release',
    'words'
)

$excludedDirectories = @($excludedTopLevel | ForEach-Object { Join-Path $projectRoot $_ })
$excludedDirectories += @('node_modules', '__pycache__')
$robocopyArgs = @(
    $projectRoot, $stageRoot, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:1', '/W:1',
    '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XD'
) + $excludedDirectories + @('/XF', '*.pyc', '*.tsbuildinfo')

& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) {
    throw "Project copy failed with robocopy exit code $LASTEXITCODE"
}

# Remove machine-generated caches from nested source folders while preserving tests and reports.
Get-ChildItem -LiteralPath $stageRoot -Recurse -Directory -Force |
    Where-Object { $_.Name -in @('__pycache__', 'node_modules') } |
    Sort-Object FullName -Descending |
    ForEach-Object {
        Assert-UnderRelease $_.FullName
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
Get-ChildItem -LiteralPath $stageRoot -Recurse -File -Force |
    Where-Object { $_.Extension -in @('.pyc', '.tsbuildinfo') } |
    ForEach-Object {
        Assert-UnderRelease $_.FullName
        Remove-Item -LiteralPath $_.FullName -Force
    }

New-Item -ItemType Directory -Path (Join-Path $stageRoot 'words') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageRoot 'pdfs') | Out-Null
Set-Content -LiteralPath (Join-Path $stageRoot 'RELEASE.txt') -Encoding UTF8 -Value @(
    "Package: $packageName",
    "Built: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz'))",
    'Package type: full source handoff plus local runtime build',
    'Continue development: read CONTINUE_ON_NEW_MACHINE.md first',
    'Install/start without Administrator: double-click START-ANF3.bat',
    'Local URL: http://127.0.0.1:8000'
)

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force

$archive = Get-Item -LiteralPath $zipPath
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
Set-Content -LiteralPath $shaPath -Encoding ASCII -Value ($hash + '  ' + $archive.Name)
Write-Host ('[OK] ' + $archive.FullName)
Write-Host ('[SIZE] ' + [Math]::Round($archive.Length / 1MB, 2) + ' MB')
Write-Host ('[SHA256] ' + $hash)
