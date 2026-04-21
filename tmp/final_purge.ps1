$files = @(
    'app/api/predict/route.ts', 
    'app/api/scheduler/experience/route.ts', 
    'app/api/scheduler/run/route.ts', 
    'app/api/edge/route.ts', 
    'app/api/generate/narrative/route.ts', 
    'app/api/backtest/run/route.ts', 
    'app/page.tsx'
)
foreach ($f in $files) {
    if (Test-Path $f) {
        (Get-Content $f -Encoding UTF8) -replace '^\s*console\.(log|error|warn).*', '' | Set-Content $f -Encoding UTF8
    }
}
