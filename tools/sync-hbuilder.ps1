[CmdletBinding()] param([string]$Target = '../HBuilderProjects/WordPal')
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$targetRoot = [IO.Path]::GetFullPath((Join-Path $sourceRoot $Target))
if ($sourceRoot -eq $targetRoot) { throw 'Source and target must be different.' }
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
$directories = @('src','packages','tools','docs','tests')
$files = @('package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','.gitignore','README.md','AGENTS.md')
foreach ($directory in $directories) {
    if (Test-Path -LiteralPath (Join-Path $sourceRoot $directory)) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot $directory) -Destination $targetRoot -Recurse -Force
    }
}
foreach ($file in $files) {
    if (Test-Path -LiteralPath (Join-Path $sourceRoot $file)) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination $targetRoot -Force
    }
}
$installedManifest = Join-Path $targetRoot 'node_modules/@dcloudio/uni-app/package.json'
if (Test-Path -LiteralPath $installedManifest) {
    $expected = (Get-Content -LiteralPath (Join-Path $targetRoot 'package.json') -Raw | ConvertFrom-Json).dependencies.'@dcloudio/uni-app'
    $installed = (Get-Content -LiteralPath $installedManifest -Raw | ConvertFrom-Json).version
    if ($expected -ne $installed) { throw 'Debug project dependencies are stale. Stop its compiler, run npm ci in the target, then sync again.' }
}
Write-Host 'HBuilderX project synchronized. Run npm ci in the target on first use.'
