param([int]$Port = 4000)

Write-Host "Ищу процесс на порту $Port..." -ForegroundColor Yellow

$connection = netstat -ano | findstr ":$Port"

if ($connection) {
    Write-Host "Найден процесс на порту $Port!" -ForegroundColor Red
    Write-Host $connection
    
    $pid = ($connection -split '\s+')[-1]
    
    if ($pid) {
        Write-Host "Останавливаю процесс с PID: $pid" -ForegroundColor Yellow
        try {
            Stop-Process -Id $pid -Force
            Write-Host "Порт $Port освобожден!" -ForegroundColor Green
        } catch {
            Write-Host "Ошибка при остановке процесса: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Порт $Port свободен!" -ForegroundColor Green
}
