#!/usr/bin/env pwsh
# Apply SQL migration using Prisma's db execute

Write-Host "Applying hybrid allocation migration..." -ForegroundColor Cyan

$sqlFile = "database/migrations/add_allocation_type.sql"

if (!(Test-Path $sqlFile)) {
    Write-Host "ERROR: Migration file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Reading migration SQL..." -ForegroundColor Yellow
$sql = Get-Content $sqlFile -Raw

Write-Host "Executing migration via Prisma..." -ForegroundColor Yellow
$sql | npx prisma db execute --stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS - Migration applied successfully!" -ForegroundColor Green
}
else {
    Write-Host "FAILED - Migration encountered errors" -ForegroundColor Red
    exit 1
}
