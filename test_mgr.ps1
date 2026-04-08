$BASE = "http://65.2.177.80:8000"
Write-Host "=== MANAGER API TEST ==="

# LOGIN
Write-Host "[1] Logging in as MGR_AP..."
try {
    $lr = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body "username=MGR_AP&password=Perfmetric@123" -ContentType "application/x-www-form-urlencoded" -ErrorAction Stop
    $tok = $lr.access_token
    Write-Host "LOGIN OK - Token length: $($tok.Length)"
} catch {
    Write-Host "LOGIN FAILED: $($_.ErrorDetails.Message)"
    exit
}

$hdr = @{ "Authorization" = "Bearer $tok" }

function Call($label, $url) {
    Write-Host ""
    Write-Host "--- $label ---"
    Write-Host "URL: $url"
    try {
        $r = Invoke-RestMethod -Uri $url -Headers $hdr -ErrorAction Stop
        $j = $r | ConvertTo-Json -Depth 6 -Compress
        Write-Host "STATUS: 200 OK"
        Write-Host "BODY: $($j.Substring(0, [Math]::Min(1000, $j.Length)))"
        return $r
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "STATUS: $code"
        Write-Host "ERROR: $($_.ErrorDetails.Message)"
        return $null
    }
}

$d1 = Call "[2] /dashboard/manager" "$BASE/dashboard/manager"
$d2 = Call "[3] /dashboard/manager/analytics" "$BASE/dashboard/manager/analytics"
$d3 = Call "[4] /dashboard/manager/team-performance?from_date=2026-04-01&to_date=2026-04-08" "$BASE/dashboard/manager/team-performance?from_date=2026-04-01&to_date=2026-04-08"
$d4 = Call "[4b] /dashboard/manager/team-performance (no filter)" "$BASE/dashboard/manager/team-performance"
$d5 = Call "[5] /dashboard/manager/employee-risk?from_date=2026-04-01&to_date=2026-04-08" "$BASE/dashboard/manager/employee-risk?from_date=2026-04-01&to_date=2026-04-08"
$d6 = Call "[5b] /dashboard/manager/employee-risk (no filter)" "$BASE/dashboard/manager/employee-risk"
$d7 = Call "[6] /manager/reports?from_date=2026-04-01&to_date=2026-04-08" "$BASE/manager/reports?from_date=2026-04-01&to_date=2026-04-08"

Write-Host ""
Write-Host "=== SCORE FIELDS ==="
if ($d2) {
    $p = if ($d2.data) { $d2.data } else { $d2 }
    Write-Host "manager_score_current       : $($p.manager_score_current)"
    Write-Host "team_score_current          : $($p.team_score_current)"
    Write-Host "manager_personal_score_current: $($p.manager_personal_score_current)"
    Write-Host "manager_score_delta_percent : $($p.manager_score_delta_percent)"
}

Write-Host ""
Write-Host "=== RECORD COUNTS ==="
if ($d3) {
    $rows = if ($d3.data -is [array]) { $d3.data } elseif ($d3 -is [array]) { $d3 } else { @() }
    Write-Host "team-performance (filtered) : $($rows.Count) records"
}
if ($d4) {
    $rows = if ($d4.data -is [array]) { $d4.data } elseif ($d4 -is [array]) { $d4 } else { @() }
    Write-Host "team-performance (all)      : $($rows.Count) records"
}
if ($d5) {
    $rows = if ($d5.data -is [array]) { $d5.data } elseif ($d5 -is [array]) { $d5 } else { @() }
    Write-Host "employee-risk (filtered)    : $($rows.Count) records"
}
if ($d6) {
    $rows = if ($d6.data -is [array]) { $d6.data } elseif ($d6 -is [array]) { $d6 } else { @() }
    Write-Host "employee-risk (all)         : $($rows.Count) records"
}

# PDF export test
Write-Host ""
Write-Host "--- [7] /reports/manager/export-pdf ---"
try {
    $re = Invoke-WebRequest -Uri "$BASE/reports/manager/export-pdf" -Headers $hdr -ErrorAction Stop
    Write-Host "STATUS: $($re.StatusCode)"
    Write-Host "Content-Type: $($re.Headers['Content-Type'])"
    Write-Host "Content-Length: $($re.Content.Length) bytes"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "STATUS: $code"
    Write-Host "ERROR: $($_.ErrorDetails.Message)"
}

Write-Host ""
Write-Host "=== TEST COMPLETE ==="
