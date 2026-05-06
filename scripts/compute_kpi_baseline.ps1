$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$inputPath = Join-Path $repoRoot 'KPI_BASELINE_TIMESTUDY.csv'
$outputPath = Join-Path $repoRoot 'KPI_BASELINE_SUMMARY.md'

if (-not (Test-Path $inputPath)) {
    throw "Input file not found: $inputPath"
}

$rows = Import-Csv -Path $inputPath
$validRows = $rows | Where-Object { $_.manual_screening_minutes -and $_.manual_screening_minutes -match '^[0-9]+(\.[0-9]+)?$' }

function Get-Median([double[]]$values) {
    if (-not $values -or $values.Count -eq 0) { return $null }
    $sorted = $values | Sort-Object
    $count = $sorted.Count
    if ($count % 2 -eq 1) {
        $mid = [int][Math]::Floor($count / 2)
        return [double]$sorted[$mid]
    }
    $a = [double]$sorted[($count / 2) - 1]
    $b = [double]$sorted[($count / 2)]
    return (($a + $b) / 2)
}

$overallMedian = $null
if ($validRows.Count -gt 0) {
    $overallMedian = Get-Median -values ([double[]]($validRows | ForEach-Object { [double]$_.manual_screening_minutes }))
}

$groupSummary = @()
$groups = $validRows | Group-Object role_type
foreach ($group in $groups) {
    $values = [double[]]($group.Group | ForEach-Object { [double]$_.manual_screening_minutes })
    $median = Get-Median -values $values
    $avg = ($values | Measure-Object -Average).Average
    $groupSummary += [PSCustomObject]@{
        RoleType = $group.Name
        SampleCount = $values.Count
        MedianMinutes = [Math]::Round($median, 2)
        AverageMinutes = [Math]::Round($avg, 2)
    }
}

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$sampleCount = $validRows.Count
$overallMedianText = if ($overallMedian -eq $null) { 'NA' } else { [Math]::Round($overallMedian, 2) }

$lines = @()
$lines += '# KPI Baseline Summary'
$lines += ''
$lines += "- Generated at: $timestamp"
$lines += "- Valid samples: $sampleCount"
$lines += "- Overall median manual screening time (minutes): $overallMedianText"
$lines += ''
$lines += '## By Role Type'
$lines += ''
$lines += '| Role Type | Sample Count | Median Minutes | Average Minutes |'
$lines += '|---|---:|---:|---:|'

if ($groupSummary.Count -eq 0) {
    $lines += '| NA | 0 | NA | NA |'
} else {
    foreach ($item in $groupSummary | Sort-Object RoleType) {
        $lines += "| $($item.RoleType) | $($item.SampleCount) | $($item.MedianMinutes) | $($item.AverageMinutes) |"
    }
}

$lines += ''
$lines += '## Next Action'
$lines += '1. Copy this summary into KPI Governance issue comment.'
$lines += '2. Update KPI_WEEKLY_TRACKER.csv notes with this baseline snapshot.'

Set-Content -Path $outputPath -Value $lines -Encoding UTF8
Write-Output "Baseline summary generated: $outputPath"
