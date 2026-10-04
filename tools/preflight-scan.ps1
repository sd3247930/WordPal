#requires -Version 5.1
<#
.SYNOPSIS
    Audit publication candidates before git add, commit or push.
.DESCRIPTION
    Default: all tracked and non-ignored files. Staged: the complete Git index.
    IncludeLocalOnly: audit docs/private separately without exposing values.
    Requires Node.js. Exit 1 blocks archiving; exit 2 means the scan could not run.
#>
[CmdletBinding()]
param(
    [string]$Root = '',
    [switch]$Staged,
    [switch]$History,
    [switch]$IncludeLocalOnly,
    [string]$Report = '',
    [int]$LargeFileMB = 5
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
$scanArgs = @((Join-Path $PSScriptRoot 'preflight-scan.mjs'), '--root', $Root, '--large-file-mb', $LargeFileMB)
if ($Staged) { $scanArgs += '--staged' }
if ($History) { $scanArgs += '--history' }
if ($IncludeLocalOnly) { $scanArgs += '--include-local-only' }
if ($Report) { $scanArgs += @('--report', $Report) }
try {
    $nodeCommand = Get-Command node -ErrorAction Stop
    & $nodeCommand.Source @scanArgs
    exit $LASTEXITCODE
} catch {
    Write-Host 'ERROR scan could not run. Install Node.js and retry; archiving is blocked.'
    exit 2
}
