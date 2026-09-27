param(
  [Parameter(Mandatory=$true)][long]$Start,
  [Parameter(Mandatory=$true)][long]$End,
  [Parameter(Mandatory=$true)][string]$Output
)
$ErrorActionPreference='Stop'
$uri='https://downloads.godotengine.org/?flavor=stable&platform=templates&slug=export_templates.tpz&version=4.7.2'
$request=[System.Net.HttpWebRequest]::Create($uri)
$request.AddRange($Start,$End)
$request.Timeout=30000
$request.ReadWriteTimeout=120000
$response=$request.GetResponse()
try {
  if ([int]$response.StatusCode -ne 206) { throw "HTTP range unavailable: $($response.StatusCode)" }
  $expected=$End-$Start+1
  $stream=$response.GetResponseStream()
  $target=[System.IO.File]::Create($Output)
  try { $stream.CopyTo($target) } finally { $target.Dispose(); $stream.Dispose() }
  $actual=(Get-Item -LiteralPath $Output).Length
  if ($actual -ne $expected) { throw "Partial download: $actual/$expected bytes" }
} finally { $response.Dispose() }
