param([string]$Godot = $env:GODOT_EXE)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Godot) {
  $Godot = Join-Path $env:LOCALAPPDATA 'Programs\Godot\Godot_v4.7.2-stable_win64_console.exe'
}
if (-not (Test-Path -LiteralPath $Godot)) {
  throw 'Set GODOT_EXE to a Godot 4.7.2 executable.'
}
foreach ($step in @('import', 'smoke')) {
  $log = Join-Path $projectRoot "validation\verify-$step.log"
  if ($step -eq 'import') {
    & $Godot --headless --path $projectRoot --editor --import --quit *> $log
  } else {
    & $Godot --headless --path $projectRoot --max-fps 120 --quit-after 7200 -- --smoke --phase=10 *> $log
  }
  $code = $LASTEXITCODE
  $content = Get-Content -Raw -LiteralPath $log
  $errors = @([regex]::Matches($content,'SCRIPT ERROR|ERROR:|Parse Error|FAIL:')).Count
  $warnings = @([regex]::Matches($content,'WARNING:')).Count
  $passed = @([regex]::Matches($content,'PASS:')).Count
  Write-Host "$step exit=$code errors=$errors warnings=$warnings checks=$passed"
  if ($code -ne 0 -or $errors -gt 0 -or ($step -eq 'smoke' -and $content -notmatch 'PHASE 10 PASS')) {
    Get-Content -LiteralPath $log -Tail 100
    exit 1
  }
  if ($warnings -gt 0) {
    Get-Content -LiteralPath $log | Select-String 'WARNING:' -Context 0,3
  }
}
Write-Host 'PASS: Godot import and all MVP behavioral checks'
exit 0
