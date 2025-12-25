#!/usr/bin/env pwsh
# Debug script to check auth endpoint with session cookies

Write-Host "`n=== DEBUGGING AUTH ENDPOINT ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

Write-Host "`n[Step 1] Testing /api/auth/me with verbose output..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -SessionVariable session -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Body:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "❌ Request failed" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Gray
    }
}

Write-Host "`n[Step 2] Checking server logs for errors..." -ForegroundColor Green
Write-Host "Please check the terminal running 'npm run dev' for any error messages" -ForegroundColor Cyan
Write-Host "Look for lines containing:" -ForegroundColor Yellow
Write-Host "  - [AUTH_SYNC_ERROR]" -ForegroundColor Gray
Write-Host "  - RLS" -ForegroundColor Gray
Write-Host "  - withRLS" -ForegroundColor Gray
Write-Host "  - prisma" -ForegroundColor Gray

Write-Host "`n[Step 3] Browser DevTools Instructions:" -ForegroundColor Green
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Press F12 to open DevTools" -ForegroundColor White
Write-Host "3. Go to Network tab" -ForegroundColor White
Write-Host "4. Navigate to /dashboard/activities/new" -ForegroundColor White
Write-Host "5. Look for the /api/auth/me request" -ForegroundColor White
Write-Host "6. Check the response - what error does it show?" -ForegroundColor White

Write-Host "`n[Step 4] Hard Refresh Instructions:" -ForegroundColor Green
Write-Host "Press Ctrl+Shift+R in your browser to clear cache and reload" -ForegroundColor Cyan
