@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .git (
    git init
    git branch -M main
    echo Добавь remote: git remote add origin https://github.com/ЛОГИН/РЕПО.git
    echo Затем снова запусти PUSH.bat
    pause
    exit /b 0
)
git add .
git status
git commit -m "Update" 2>nul || git commit -m "Initial commit"
git push origin main 2>nul || (
    echo.
    echo Если push не сработал: git remote add origin https://github.com/ЛОГИН/РЕПО.git
    echo Потом снова запусти PUSH.bat
)
pause
