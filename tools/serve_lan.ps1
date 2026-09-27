param([Parameter(Mandatory)][string]$LanIp)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$tls = Join-Path $root '.godot\tls'
foreach ($path in @($node, (Join-Path $tls 'iphone-server.crt'),
                       (Join-Path $tls 'iphone-server.key'), (Join-Path $tls 'iphone-ca.cer'))) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required file missing: $path" }
}
$address = $null
if (-not [System.Net.IPAddress]::TryParse($LanIp, [ref]$address) -or
    $address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'LanIp must be an IPv4 address.'
}
$env:PAPERHD2D_HOST = $LanIp
$env:PAPERHD2D_PORT = '8769'
$env:PAPERHD2D_TLS_CERT = Join-Path $tls 'iphone-server.crt'
$env:PAPERHD2D_TLS_KEY = Join-Path $tls 'iphone-server.key'
$env:PAPERHD2D_CA_CERT = Join-Path $tls 'iphone-ca.cer'
Write-Output "Serving PaperHD2D at https://${LanIp}:8769/ (Ctrl+C to stop)"
& $node (Join-Path $PSScriptRoot 'serve-web.cjs')
