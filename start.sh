#!/bin/bash

set -e

echo "========================================"
echo "  Запуск проекта Next.js"
echo "========================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[ОШИБКА] Node.js не установлен!"
    echo "Пожалуйста, установите Node.js с https://nodejs.org/"
    exit 1
fi

echo "[✓] Node.js найден: $(node --version)"
echo ""

if ! command -v npm &> /dev/null; then
    echo "[ОШИБКА] npm не установлен!"
    exit 1
fi

echo "[✓] npm найден: $(npm --version)"
echo ""

if [ ! -d "node_modules" ]; then
    echo "[i] Зависимости не установлены. Устанавливаю..."
    echo ""
    
    if ! npm install; then
        echo "[ОШИБКА] Не удалось установить зависимости"
        exit 1
    fi
    
    echo ""
    echo "[✓] Зависимости установлены"
else
    echo "[✓] Зависимости уже установлены"
fi

echo ""

echo "[i] Проверяю порт 4000..."

if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "[i] Порт 4000 занят. Освобождаю..."
    PID=$(lsof -ti:4000)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo "[✓] Порт 4000 освобожден"
    fi
else
    echo "[✓] Порт 4000 свободен"
fi

echo ""

echo "========================================"
echo "  Запуск сервера разработки..."
echo "  Откройте http://localhost:4000"
echo "========================================"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

npm run dev
