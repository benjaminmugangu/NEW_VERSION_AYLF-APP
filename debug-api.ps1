
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/simulation-lifecycle?action=sc_approve_report" -Method Get -ErrorAction Stop
    Write-Output $response
}
catch {
    Write-Output "Status Code: $($_.Exception.Response.StatusCode.value__)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Output "Error Body: $body"
}
