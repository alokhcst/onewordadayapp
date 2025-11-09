#!/usr/bin/env pwsh
# Script to check Lambda function logs for errors (last 10 minutes, EST timezone)

Write-Host "Checking Lambda Function Logs (Last 10 Minutes - EST)..." -ForegroundColor Cyan

$functions = @(
    "onewordaday-production-feedback-processor",
    "onewordaday-production-get-todays-word",
    "onewordaday-production-word-generation",
    "onewordaday-production-content-enrichment",
    "onewordaday-production-notification-dispatcher",
    "onewordaday-production-user-preferences",
    "onewordaday-production-word-history",
    "onewordaday-production-ai-word-generation"
)

# Calculate start time (10 minutes ago)
$startTime = (Get-Date).AddMinutes(-10)
$startTimeUtc = $startTime.ToUniversalTime()

# Get EST timezone
$estZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time")

Write-Host "`nShowing logs from: $($startTime.ToString('yyyy-MM-dd hh:mm:ss tt')) EST" -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Gray

foreach ($function in $functions) {
    Write-Host "Checking logs for: $function" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Gray
    
    # Get latest log stream
    $logGroup = "/aws/lambda/$function"
    
    # Check if log group exists
    $logGroupExists = aws logs describe-log-groups --log-group-name-prefix $logGroup --query "logGroups[?logGroupName=='$logGroup']" --output json | ConvertFrom-Json
    
    if ($logGroupExists.Count -eq 0) {
        Write-Host "  [INFO] Log group not found: $logGroup" -ForegroundColor Gray
        Write-Host "         Function hasn't been invoked yet or doesn't exist.`n" -ForegroundColor Gray
        continue
    }
    
    # Get log events from last 10 minutes
    Write-Host "  Recent log entries:" -ForegroundColor Cyan
    
    # Get logs using --since parameter (10 minutes)
    $logs = aws logs tail $logGroup --since 10m --format short 2>&1
    
    if ($logs) {
        # Parse and convert timestamps to EST
        $logs | ForEach-Object {
            if ($_ -match '^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})') {
                $timestamp = $matches[1]
                try {
                    # Parse as UTC and explicitly set Kind to UTC
                    $utcTime = [DateTime]::SpecifyKind([DateTime]::Parse($timestamp), [DateTimeKind]::Utc)
                    $estTime = [System.TimeZoneInfo]::ConvertTimeFromUtc($utcTime, $estZone)
                    $estTimeString = $estTime.ToString('yyyy-MM-dd hh:mm:ss tt')
                    $_ -replace $timestamp, "[$estTimeString EST]"
                } catch {
                    $_
                }
            } else {
                $_
            }
        } | Select-Object -Last 50
    } else {
        Write-Host "  [INFO] No logs found in the last 10 minutes" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "`nLog check complete!" -ForegroundColor Green
Write-Host "`nLook for:" -ForegroundColor Yellow
Write-Host "  - Error messages or stack traces" -ForegroundColor White
Write-Host "  - Task timed out messages" -ForegroundColor White
Write-Host "  - Cannot find module errors" -ForegroundColor White
Write-Host "  - require() of ES Module errors" -ForegroundColor White
Write-Host "  - DynamoDB access errors" -ForegroundColor White
Write-Host "  - Missing environment variables" -ForegroundColor White

Write-Host "`nTip: If you see 'require() of ES Module' errors, run: .\deploy-esm.ps1" -ForegroundColor Cyan

