#!/usr/bin/env pwsh
# Apply RLS policy updates for hybrid allocation

Write-Host "Applying hybrid allocation RLS policies..." -ForegroundColor Cyan

# Drop old policy
$dropSql = @"
DROP POLICY IF EXISTS "Coordinators can create allocations" ON public.fund_allocations;
"@

# Create new policy from file
$policyFile = "database/policies/fund_allocations.sql"

if (!(Test-Path $policyFile)) {
    Write-Host "ERROR: Policy file not found: $policyFile" -ForegroundColor Red
    exit 1
}

Write-Host "Dropping old policy..." -ForegroundColor Yellow
$dropSql | npx prisma db execute --stdin

Write-Host "Applying new hybrid allocation policies..." -ForegroundColor Yellow
Get-Content $policyFile -Raw | npx prisma db execute --stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS - RLS policies updated successfully!" -ForegroundColor Green
}
else {
    Write-Host "FAILED - Policy update encountered errors" -ForegroundColor Red
    exit 1
}
