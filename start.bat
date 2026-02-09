@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js не установлен. Установите с https://nodejs.org/ & pause & exit /b 1)
if not exist "node_modules" call npm install
netstat -ano | findstr :4000 >nul 2>&1 && powershell -ExecutionPolicy Bypass -File "./free-port.ps1" 4000 2>nul
echo Запуск http://localhost:4000
call npm run dev
pause
