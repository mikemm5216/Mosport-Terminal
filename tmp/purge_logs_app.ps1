$paths = @("app")
foreach ($path in $paths) {
    if (Test-Path $path) {
        Get-ChildItem -Path $path -Filter *.ts,*.tsx -Recurse | ForEach-Object {
            $content = Get-Content $_.FullName
            $newContent = $content | ForEach-Object {
                if ($_ -match '^\s*console\.(log|error|warn)') {
                    if ($_ -match 'catch\(console\.error\)') {
                        $_ -replace 'catch\(console\.error\)', 'catch(() => {})'
                    } else {
                        $null
                    }
                } else {
                    $_
                }
            }
            $newContent | Set-Content $_.FullName
        }
    }
}
