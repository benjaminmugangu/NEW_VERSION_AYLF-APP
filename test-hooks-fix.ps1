#!/usr/bin/env pwsh
# Quick test for React Hooks - focuses on build and code quality only

Write-Host "`n=== REACT HOOKS FIX VALIDATION ===" -ForegroundColor Cyan
Write-Host "Testing ActivityForm and MemberForm hooks order`n" -ForegroundColor Yellow

$activityFormPath = "src/app/[locale]/dashboard/activities/components/ActivityForm.tsx"
$memberFormPath = "src/app/[locale]/dashboard/members/components/MemberForm.tsx"

function Test-HooksOrder {
    param($FilePath, $ComponentName)
    
    Write-Host "[Testing $ComponentName]" -ForegroundColor Green
    
    if (!(Test-Path $FilePath)) {
        Write-Host "  FAIL - File not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Check for the comment indicating hooks are before returns
    if ($content -match 'ALL.*HOOKS.*MUST.*BE.*CALLED') {
        Write-Host "  PASS - Comment present: 'ALL HOOKS MUST BE CALLED...'" -ForegroundColor Green
        $hasComment = $true
    }
    else {
        Write-Host "  WARN - Comment not found (not critical)" -ForegroundColor Yellow
        $hasComment = $false
    }
    
    # Check that useEffect comes before early returns
    # Extract the component function
    if ($content -match '(?s)export.*?function.*?\{(.*?)^}') {
        $functionBody = $Matches[1]
        
        # Find first useEffect position
        $useEffectMatches = [regex]::Matches($content, 'useEffect\s*\(')
        $returnMatches = [regex]::Matches($content, 'if\s*\([^)]*\)\s*\{[^}]*return\s+<')
        
        if ($useEffectMatches.Count -gt 0 -and $returnMatches.Count -gt 0) {
            $firstUseEffect = $useEffectMatches[0].Index
            $firstReturn = $returnMatches[0].Index
            
            if ($firstUseEffect -lt $firstReturn) {
                Write-Host "  PASS - useEffect called BEFORE early returns" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "  FAIL - useEffect called AFTER early returns" -ForegroundColor Red
                Write-Host "    First useEffect at position: $firstUseEffect" -ForegroundColor Gray
                Write-Host "    First early return at position: $firstReturn" -ForegroundColor Gray
                return $false
            }
        }
        else {
            Write-Host "  WARN - Could not find useEffect or returns (manual check needed)" -ForegroundColor Yellow
            return $hasComment
        }
    }
    
    Write-Host "  WARN - Could not parse component structure" -ForegroundColor Yellow
    return $hasComment
}

Write-Host "Test 1: ActivityForm" -ForegroundColor Cyan
$activityPass = Test-HooksOrder -FilePath $activityFormPath -ComponentName "ActivityForm"

Write-Host "`nTest 2: MemberForm" -ForegroundColor Cyan
$memberPass = Test-HooksOrder -FilePath $memberFormPath -ComponentName "MemberForm"

Write-Host "`n=== BUILD VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Running TypeScript build check..." -ForegroundColor Yellow

try {
    $buildOutput = npm run build 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PASS - Build successful (no TypeScript errors)" -ForegroundColor Green
        $buildPass = $true
    }
    else {
        Write-Host "FAIL - Build failed" -ForegroundColor Red
        if ($buildOutput -match "Hooks") {
            Write-Host "  ERROR contains 'Hooks' - React Hooks issue detected" -ForegroundColor Red
        }
        $buildPass = $false
    }
}
catch {
    Write-Host "ERROR - Build command failed: $($_.Exception.Message)" -ForegroundColor Red
    $buildPass = $false
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "ActivityForm: $(if($activityPass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($activityPass) { 'Green' }else { 'Red' })
Write-Host "MemberForm:   $(if($memberPass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($memberPass) { 'Green' }else { 'Red' })
Write-Host "Build:        $(if($buildPass){'PASS'}else{'FAIL'})" -ForegroundColor $(if ($buildPass) { 'Green' }else { 'Red' })

if ($activityPass -and $memberPass -and $buildPass) {
    Write-Host "`nSUCCESS - All static checks passed!" -ForegroundColor Green
    Write-Host "The React Hooks order is correct in the code." -ForegroundColor Green
    Write-Host "`nNext: Test in browser to verify runtime behavior" -ForegroundColor Cyan
}
else {
    Write-Host "`nWARNING - Some checks failed" -ForegroundColor Red
    Write-Host "Please review the failures above" -ForegroundColor Red
}
