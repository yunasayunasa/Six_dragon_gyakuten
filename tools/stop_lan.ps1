$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $root '.godot\lan-server.json'
if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Output 'No background PaperHD2D server is recorded.'
    exit 0
}
$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
$expectedNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$process = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
if ($null -eq $process) {
    Remove-Item -LiteralPath $statePath
    Write-Output 'Recorded PaperHD2D server is already stopped.'
    exit 0
}
if ($process.Path -ine $expectedNode -or
    $process.StartTime.ToUniversalTime().Ticks -ne [long]$state.startTicks) {
    throw 'Recorded PID belongs to another process; no process was stopped.'
}
Stop-Process -Id $process.Id -Force
Remove-Item -LiteralPath $statePath
Write-Output "Stopped PaperHD2D server PID $($process.Id)."
