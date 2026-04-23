$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$localNode = Join-Path $root ".tools\node\node-v22.22.2-win-x64\node.exe"
$localNpmCli = Join-Path $root ".tools\node\node-v22.22.2-win-x64\node_modules\npm\bin\npm-cli.js"
$localPnpm = Join-Path $root ".tools\pnpm\pnpm-win-x64.exe"

if (Test-Path $localNode) {
  $node = $localNode
} else {
  $node = (Get-Command node).Source
}

if (!(Test-Path (Join-Path $root "node_modules\pg"))) {
  Write-Host ""
  Write-Host "Instalando dependencias do Fast Crochet..." -ForegroundColor Yellow
  Write-Host ""

  if (Test-Path $localPnpm) {
    & $localPnpm install
  } elseif (Test-Path $localNpmCli) {
    & $node $localNpmCli install
  } else {
    npm install
  }
}

Write-Host ""
Write-Host "Fast Crochet iniciando em http://localhost:3210" -ForegroundColor Cyan
Write-Host "Use Ctrl+C para encerrar." -ForegroundColor DarkGray
Write-Host ""

& $node (Join-Path $root "server.mjs")
