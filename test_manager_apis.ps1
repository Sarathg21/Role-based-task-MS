
$BASE = "http://65.2.177.80:8000"
$sep = "`n" + ("="*60) + "`n"

Write-Host $sep -ForegroundColor Cyan
Write-Host "MANAGER DASHBOARD API TEST SUITE" -ForegroundColor Yellow
Write-Host "Backend: $BASE" -ForegroundColor Gray
Write-Host $sep -ForegroundColor Cyan

# ── STEP 1: LOGIN ──────────────────────────────────────────
Write-Host "`n[1/7] LOGIN as MGR_AP..." -ForegroundColor Green
$TOKEN = $null
try {
    $loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" `
        -Method POST `
        -Body "username=MGR_AP&password=Perfmetric@123" `
        -ContentType "application/x-www-form-urlencoded" `
        -ErrorAction Stop

    $TOKEN = $loginResp.access_token
    Write-Host "  ✅ Login SUCCESS" -ForegroundColor Green
    Write-Host "  Token (first 60): $($TOKEN.Substring(0, [Math]::Min(60, $TOKEN.Length)))..." -ForegroundColor Gray
    Write-Host "  Role: $($loginResp.role ?? $loginResp.token_type)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Login FAILED: $($_.ErrorDetails.Message ?? $_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$H = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

function Test-Endpoint {
    param(
        [string]$Label,
        [string]$Url,
        [string]$ExpectedFields = ""
    )
    Write-Host "`n$Label" -ForegroundColor Green
    Write-Host "  URL: $Url" -ForegroundColor Gray
    try {
        $r = Invoke-RestMethod -Uri $Url -Headers $H -ErrorAction Stop
        $json = $r | ConvertTo-Json -Depth 5 -Compress
        Write-Host "  ✅ HTTP 200 OK" -ForegroundColor Green
        Write-Host "  Response (first 800 chars):" -ForegroundColor Gray
        Write-Host ("  " + $json.Substring(0, [Math]::Min(800, $json.Length))) -ForegroundColor White
        if ($ExpectedFields) {
            $fields = $ExpectedFields -split ","
            foreach ($f in $fields) {
                $f = $f.Trim()
                $found = $json -like "*`"$f`"*"
                $icon = if ($found) { "✅" } else { "❌ MISSING" }
                Write-Host "  Field '$f': $icon" -ForegroundColor (if ($found) { "Green" } else { "Red" })
            }
        }
        return $r
    } catch {
        $status = $_.Exception.Response?.StatusCode?.value__
        $detail = $_.ErrorDetails.Message ?? $_.Exception.Message
        Write-Host "  ❌ HTTP $status - $detail" -ForegroundColor Red
        return $null
    }
}

# ── STEP 2: MAIN MANAGER DASHBOARD ─────────────────────────
$dash = Test-Endpoint `
    -Label "[2/7] GET /dashboard/manager" `
    -Url "$BASE/dashboard/manager" `
    -ExpectedFields "total_tasks,approved_tasks,in_progress_tasks,overdue_tasks,rework_tasks,new_tasks"

# ── STEP 3: ANALYTICS (Score Fields) ───────────────────────
$analytics = Test-Endpoint `
    -Label "[3/7] GET /dashboard/manager/analytics  ← SCORE FIELDS" `
    -Url "$BASE/dashboard/manager/analytics" `
    -ExpectedFields "manager_score_current,team_score_current,manager_personal_score_current,manager_score_delta_percent"

# ── STEP 4: TEAM PERFORMANCE with date filters ─────────────
$teamPerf = Test-Endpoint `
    -Label "[4/7] GET /dashboard/manager/team-performance?from_date=2026-04-01&to_date=2026-04-08" `
    -Url "$BASE/dashboard/manager/team-performance?from_date=2026-04-01&to_date=2026-04-08" `
    -ExpectedFields "name,tasks_assigned,tasks_completed"

Write-Host "`n  [Date filter variation - month range]" -ForegroundColor Yellow
Test-Endpoint `
    -Label "  → /dashboard/manager/team-performance?from_date=2026-01-01&to_date=2026-04-08" `
    -Url "$BASE/dashboard/manager/team-performance?from_date=2026-01-01&to_date=2026-04-08" | Out-Null

# ── STEP 5: EMPLOYEE RISK with date filters ─────────────────
$empRisk = Test-Endpoint `
    -Label "[5/7] GET /dashboard/manager/employee-risk?from_date=2026-04-01&to_date=2026-04-08" `
    -Url "$BASE/dashboard/manager/employee-risk?from_date=2026-04-01&to_date=2026-04-08" `
    -ExpectedFields "name,risk_level,overdue_count"

Write-Host "`n  [No date filter - all time]" -ForegroundColor Yellow
$empRiskAll = Test-Endpoint `
    -Label "  → /dashboard/manager/employee-risk (no filter)" `
    -Url "$BASE/dashboard/manager/employee-risk" `
    -ExpectedFields "name,risk_level,overdue_count"

# ── STEP 6: MANAGER REPORTS ────────────────────────────────
Test-Endpoint `
    -Label "[6/7] GET /manager/reports?from_date=2026-04-01&to_date=2026-04-08" `
    -Url "$BASE/manager/reports?from_date=2026-04-01&to_date=2026-04-08" `
    -ExpectedFields "manager_stats" | Out-Null

# ── STEP 7: REPORT EXPORT (PDF) ───────────────────────────
Write-Host "`n[7/7] GET /reports/manager/export-pdf" -ForegroundColor Green
Write-Host "  URL: $BASE/reports/manager/export-pdf" -ForegroundColor Gray
try {
    $r = Invoke-WebRequest -Uri "$BASE/reports/manager/export-pdf" `
        -Headers $H -ErrorAction Stop
    $ct = $r.Headers["Content-Type"]
    $len = $r.Content.Length
    Write-Host "  ✅ HTTP $($r.StatusCode) - Content-Type: $ct, Size: $len bytes" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response?.StatusCode?.value__
    Write-Host "  ❌ HTTP $status - $($_.ErrorDetails.Message ?? $_.Exception.Message)" -ForegroundColor Red
}

# ── SUMMARY ───────────────────────────────────────────────
Write-Host $sep -ForegroundColor Cyan
Write-Host "SCORE FIELD SUMMARY:" -ForegroundColor Yellow
if ($analytics) {
    $payload = if ($analytics.data) { $analytics.data } else { $analytics }
    Write-Host "  manager_score_current      : $($payload.manager_score_current ?? '❌ NOT FOUND')" -ForegroundColor White
    Write-Host "  team_score_current         : $($payload.team_score_current ?? '❌ NOT FOUND')" -ForegroundColor White
    Write-Host "  manager_personal_score_current: $($payload.manager_personal_score_current ?? '❌ NOT FOUND')" -ForegroundColor White
    Write-Host "  manager_score_delta_percent: $($payload.manager_score_delta_percent ?? '❌ NOT FOUND')" -ForegroundColor White
}

if ($teamPerf) {
    $rows = if ($teamPerf.data) { $teamPerf.data } elseif ($teamPerf -is [array]) { $teamPerf } else { @() }
    Write-Host "`n  team-performance records    : $($rows.Count)" -ForegroundColor White
}
if ($empRisk) {
    $rows2 = if ($empRisk.data) { $empRisk.data } elseif ($empRisk -is [array]) { $empRisk } else { @() }
    Write-Host "  employee-risk records       : $($rows2.Count)" -ForegroundColor White
}
Write-Host $sep -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Yellow
