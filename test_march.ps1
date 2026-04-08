$BASE = "http://65.2.177.80:8000"
Write-Host "=== MARCH DATA VERIFICATION ==="

# LOGIN
$lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body "username=MGR_AP&password=Perfmetric@123" -ContentType "application/x-www-form-urlencoded"
$hdr = @{ "Authorization" = "Bearer $($lr.access_token)" }

function Call($label, $url) {
    Write-Host "`n--- $label ---"
    try {
        $r = Invoke-RestMethod -Uri $url -Headers $hdr
        $j = $r | ConvertTo-Json -Depth 6 -Compress
        Write-Host "STATUS: 200 OK"
        Write-Host "BODY: $($j.Substring(0, [Math]::Min(1000, $j.Length)))"
    } catch {
        Write-Host "STATUS: $($_.Exception.Response.StatusCode.value__)"
    }
}

Call "Analytics (March)" "$BASE/dashboard/manager/analytics?from_date=2026-03-01&to_date=2026-03-31"
Call "Team Perf (March)" "$BASE/dashboard/manager/team-performance?from_date=2026-03-01&to_date=2026-03-31"
Call "Emp Risk (March)" "$BASE/dashboard/manager/employee-risk?from_date=2026-03-01&to_date=2026-03-31"
