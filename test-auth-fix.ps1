#!/usr/bin/env pwsh
# Test script to verify auth fixes

Write-Host "`n=== TESTING AUTH FIXES ===" -ForegroundColor Cyan
Write-Host "Testing the endpoints that were causing 'Authentication Error'`n" -ForegroundColor Yellow

$baseUrl = "http://localhost:3000"

Write-Host "[1/3] Testing /api/auth/me endpoint..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -ErrorAction Stop
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    if ($json.user) {
        Write-Host "✅ User profile loaded successfully" -ForegroundColor Green
        Write-Host "   - Name: $($json.user.name)" -ForegroundColor Gray
        Write-Host "   - Role: $($json.user.role)" -ForegroundColor Gray
        Write-Host "   - Email: $($json.user.email)" -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️  Response doesn't contain user object" -ForegroundColor Yellow
    }
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "⚠️  401 Unauthorized - This is expected if not logged in" -ForegroundColor Yellow
        Write-Host "   Please open the browser, login at http://localhost:3000, then re-run this test" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n[2/3] Testing /dashboard/activities/new page..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/dashboard/activities/new" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Page loads successfully (Status: 200)" -ForegroundColor Green
        
        # Check if response contains "Authentication Error"
        if ($response.Content -match "Authentication Error") {
            Write-Host "❌ FAIL: Page still shows 'Authentication Error'" -ForegroundColor Red
        }
        else {
            Write-Host "✅ PASS: No authentication error detected" -ForegroundColor Green
        }
    }
}
catch {
    if ($_.Exception.Response.StatusCode -eq 307 -or $_.Exception.Response.StatusCode -eq 302) {
        Write-Host "⚠️  Redirect detected - Login required" -ForegroundColor Yellow
        Write-Host "   This is normal if not logged in. Please test manually in browser." -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n[3/3] Testing /dashboard/members/new page..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/dashboard/members/new" -Method GET -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Page loads successfully (Status: 200)" -ForegroundColor Green
        
        # Check if response contains "Authentication Error"
        if ($response.Content -match "Authentication Error") {
            Write-Host "❌ FAIL: Page still shows 'Authentication Error'" -ForegroundColor Red
        }
        else {
            Write-Host "✅ PASS: No authentication error detected" -ForegroundColor Green
        }
    }
}
catch {
    if ($_.Exception.Response.StatusCode -eq 307 -or $_.Exception.Response.StatusCode -eq 302) {
        Write-Host "⚠️  Redirect detected - Login required" -ForegroundColor Yellow
        Write-Host "   This is normal if not logged in. Please test manually in browser." -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== MANUAL TESTING INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host "1. Open your browser and navigate to: http://localhost:3000" -ForegroundColor White
Write-Host "2. Login with your credentials" -ForegroundColor White
Write-Host "3. Navigate to /dashboard/activities/new" -ForegroundColor White
Write-Host "4. Navigate to /dashboard/members/new" -ForegroundColor White
Write-Host "5. Verify that both pages load WITHOUT 'Authentication Error'" -ForegroundColor White
Write-Host "6. Check the sidebar - 'Scenario Site' and 'Scenario Group' badges should NOT appear for NC role`n" -ForegroundColor White
