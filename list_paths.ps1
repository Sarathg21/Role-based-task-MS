$resp = Invoke-WebRequest -Uri 'http://65.2.177.80:8000/openapi.json' -UseBasicParsing
$json = $resp.Content | ConvertFrom-Json
foreach($p in $json.paths.PSObject.Properties) {
    if ($p.Name -match "manager") {
        Write-Host $p.Name
    }
}
