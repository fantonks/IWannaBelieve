$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js не установлен. Установите с https://nodejs.org/" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "node_modules")) {
    npm install
}
$port = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($port) { Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host "Запуск http://localhost:4000" -ForegroundColor Cyan
npm run dev
