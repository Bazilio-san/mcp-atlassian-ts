# Установка английского языка для ошибок
[System.Threading.Thread]::CurrentThread.CurrentUICulture = 'en-US'
[System.Threading.Thread]::CurrentThread.CurrentCulture = 'en-US'
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
chcp 65001 > $null

# Получаем процессы, которые используют node_modules
$processes = Get-Process | Where-Object {$_.Path -like "*node_modules*"}

# Проверяем, есть ли такие процессы
if ($processes.Count -gt 0) {
    Write-Host "Обнаружены следующие процессы, держащие файлы в папке node_modules:" -ForegroundColor Yellow

    # Выводим информацию о каждом процессе
    $processes | ForEach-Object {
        Write-Host "- $($_.ProcessName) (ID: $($_.Id))" -ForegroundColor Cyan
    }

    Write-Host "`nЗавершаем процессы..." -ForegroundColor Yellow

    # Завершаем процессы
    $processes | ForEach-Object {
        Stop-Process -Id $_.Id -Force
        Write-Host "Процесс $($_.ProcessName) (ID: $($_.Id)) завершен" -ForegroundColor Green
    }
}

Write-Host "Removing node_modules. It may take a while..."

# Игнорирование ошибок, аналог set +e
#$ErrorActionPreference = "Continue"

# Удаление директории node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules


# Проверяем, существует ли всё ещё директория
if (Test-Path -Path "node_modules") {
    Write-Host "ОШИБКА: Не удалось полностью удалить папку node_modules!" -ForegroundColor Red
}

# Удаление файла yarn.lock, если он существует
if (Test-Path -Path "yarn.lock") {
    Remove-Item -Path "yarn.lock" -Force
}

Write-Host "Do yarn install..."

yarn install

# Если передан аргумент, ожидать нажатие клавиши
if ($args.Count -gt 0) {
    Read-Host "Press Enter to resume ..."
}
