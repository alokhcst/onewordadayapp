#!/usr/bin/env pwsh
# Script to check Lambda function logs for errors

Write-Host "Checking Lambda Function Logs..." -ForegroundColor Cyan

$functions = @(
    "onewordaday-production-feedback-processor",
    "onewordaday-production-get-todays-word",
    "onewordaday-production-word-generation",
    "onewordaday-production-content-enrichment",
    "onewordaday-production-notification-dispatcher",
    "onewordaday-production-feedback-processor",
    "onewordaday-production-user-preferences",
    "onewordaday-production-word-history"
)

foreach ($function in $functions) {
    Write-Host "`nChecking logs for: $function" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Gray
    
    # Get latest log stream
    $logGroup = "/aws/lambda/$function"
    
    # Check if log group exists
    $logGroupExists = aws logs describe-log-groups --log-group-name-prefix $logGroup --query "logGroups[?logGroupName=='$logGroup']" --output json | ConvertFrom-Json
    
    if ($logGroupExists.Count -eq 0) {
        Write-Host "ERROR: Log group not found: $logGroup" -ForegroundColor Red
        Write-Host "       This means the Lambda function hasn't been invoked yet or doesn't exist." -ForegroundColor Yellow
        continue
    }
    
    # Get last 50 log events
    Write-Host "Last 50 log entries:" -ForegroundColor Cyan
    aws logs tail $logGroup --since 1h --format short | Select-Object -Last 50
    
    Write-Host ""
}

Write-Host "`nLog check complete!" -ForegroundColor Green
Write-Host "`nLook for:" -ForegroundColor Yellow
Write-Host "  - Error messages or stack traces" -ForegroundColor White
Write-Host "  - Task timed out messages" -ForegroundColor White
Write-Host "  - Cannot find module errors" -ForegroundColor White
Write-Host "  - DynamoDB access errors" -ForegroundColor White
Write-Host "  - Missing environment variables" -ForegroundColor White
