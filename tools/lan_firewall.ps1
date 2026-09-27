param([ValidateSet('Enable','Disable')][string]$Action = 'Enable')
$ErrorActionPreference = 'Stop'
$name = 'PaperHD2D HTTPS LAN 8769'
$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$admin = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $admin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script as Administrator.'
}
if ($Action -eq 'Enable' -and -not (Test-Path -LiteralPath $node)) {
    throw "Node runtime missing: $node"
}
$existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
if ($existing) {
    $app = $existing | Get-NetFirewallApplicationFilter
    $port = $existing | Get-NetFirewallPortFilter
    $address = $existing | Get-NetFirewallAddressFilter
    if ($existing.Count -ne 1 -or $app.Program -ine $node -or $port.Protocol -ne 'TCP' -or
        $port.LocalPort -ne '8769' -or $address.RemoteAddress -ne 'LocalSubnet' -or
        $existing.Profile -ne 'Private' -or $existing.Direction -ne 'Inbound' -or
        $existing.Action -ne 'Allow') {
        throw 'An unexpected rule has the same name; no changes made.'
    }
}
if ($Action -eq 'Enable') {
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $name -Description 'PaperHD2D local Web demo, Private LAN only' `
            -Direction Inbound -Action Allow -Enabled True -Profile Private -Program $node `
            -Protocol TCP -LocalPort 8769 -RemoteAddress LocalSubnet | Out-Null
    }
    Write-Output 'PASS: PaperHD2D Private/LocalSubnet/TCP 8769 rule enabled.'
} else {
    if ($existing) { $existing | Remove-NetFirewallRule }
    Write-Output 'PASS: PaperHD2D LAN rule removed.'
}
