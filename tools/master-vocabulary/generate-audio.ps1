[CmdletBinding()] param([string]$InputFile='private/master-vocabulary/audio-jobs.json',[string]$OutputDirectory='src/static/local-master-audio')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$wordPalSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $wordPalVoice=@($wordPalSynth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1)
    if (!$wordPalVoice.Count) { throw 'No offline English voice is installed. Install an English system voice before generating audio.' }
    $wordPalSynth.SelectVoice($wordPalVoice[0].VoiceInfo.Name)
    $wordPalSynth.Rate=-1
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    $wordPalJobs=Get-Content -LiteralPath $InputFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $wordPalCount=0
    foreach ($wordPalJob in $wordPalJobs) {
        if ($wordPalJob.id -notmatch '^[a-f0-9]{20}$' -or [string]::IsNullOrWhiteSpace($wordPalJob.text)) { throw 'Invalid audio job.' }
        $wordPalOutput=Join-Path $OutputDirectory ($wordPalJob.id+'.wav')
        if (!(Test-Path -LiteralPath $wordPalOutput)) {
            $wordPalSynth.SetOutputToWaveFile($wordPalOutput)
            $wordPalSynth.Speak($wordPalJob.text)
            $wordPalSynth.SetOutputToNull()
        }
        $wordPalCount++
        if ($wordPalCount % 100 -eq 0) { Write-Host "Generated or reused $wordPalCount offline clips." }
    }
    Write-Host "Offline audio complete: $wordPalCount clips; en-US system voice, local use."
} finally { $wordPalSynth.Dispose() }

