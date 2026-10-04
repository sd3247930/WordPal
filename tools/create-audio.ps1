# Offline reference pronunciation generated from the installed English system voice.
[CmdletBinding()] param()
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskRoot = Split-Path -Parent $PSScriptRoot
$content = Get-Content -LiteralPath (Join-Path $taskRoot 'src/content/starter.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$audioDir = Join-Path $taskRoot 'src/static/audio'
New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $voice = $speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1
    if (-not $voice) { throw 'An installed en-US voice is required.' }
    $speaker.SelectVoice($voice.VoiceInfo.Name)
    $speaker.Rate = -2
    foreach ($word in $content.words) {
        $speaker.SetOutputToWaveFile((Join-Path $audioDir ($word.id + '.wav')))
        $speaker.Speak([string]$word.word)
        $speaker.SetOutputToNull()
    }
} finally { $speaker.Dispose() }
