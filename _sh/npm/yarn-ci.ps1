Write-Host "Removing node_modules. It may take a while..."

# Игнорирование ошибок, аналог set +e
$ErrorActionPreference = "Continue"

# Удаление директории node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules

Write-Host "Do yarn ci..."

yarn install --frozen-lockfile

# Если передан аргумент, ожидать нажатие клавиши
if ($args.Count -gt 0) {
  Read-Host "Press Enter to resume ..."
}
