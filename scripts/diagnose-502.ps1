#!/usr/bin/env pwsh
# Comprehensive 502 Error Diagnostic Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  502 Bad Gateway Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$functions = @(
    "onewordaday-production-feedback-processor",
    "onewordaday-production-get-todays-word"
)

# Check 1: Lambda Functions Exist
Write-Host "`n[1/5] Checking if Lambda functions exist..." -ForegroundColor Yellow
foreach ($function in $functions) {
    try {
        $config = aws lambda get-function-configuration --function-name $function 2>&1 | ConvertFrom-Json
        if ($config.FunctionName) {
            Write-Host "  [OK] $function exists" -ForegroundColor Green
            Write-Host "       Runtime: $($config.Runtime)" -ForegroundColor Gray
            Write-Host "       Timeout: $($config.Timeout)s" -ForegroundColor Gray
            Write-Host "       Memory: $($config.MemorySize)MB" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [ERROR] $function not found!" -ForegroundColor Red
        Write-Host "       You may need to deploy the Lambda function" -ForegroundColor Yellow
    }
}

# Check 2: Environment Variables
Write-Host "`n[2/5] Checking environment variables..." -ForegroundColor Yellow
foreach ($function in $functions) {
    try {
        $config = aws lambda get-function-configuration --function-name $function 2>&1 | ConvertFrom-Json
        if ($config.Environment.Variables) {
            Write-Host "  [OK] $function has environment variables:" -ForegroundColor Green
            $config.Environment.Variables.PSObject.Properties | ForEach-Object {
                Write-Host "       $($_.Name) = $($_.Value)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  [WARNING] $function has no environment variables" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [SKIP] $function not found" -ForegroundColor Gray
    }
}

# Check 3: Recent Invocations
Write-Host "`n[3/5] Checking recent invocations (last 24h)..." -ForegroundColor Yellow
$since = (Get-Date).AddDays(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
foreach ($function in $functions) {
    try {
        $metrics = aws cloudwatch get-metric-statistics `
            --namespace AWS/Lambda `
            --metric-name Invocations `
            --dimensions Name=FunctionName,Value=$function `
            --start-time $since `
            --end-time (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") `
            --period 86400 `
            --statistics Sum 2>&1 | ConvertFrom-Json
        
        if ($metrics.Datapoints.Count -gt 0) {
            $total = ($metrics.Datapoints | Measure-Object -Property Sum -Sum).Sum
            Write-Host "  [INFO] $function invoked $total times" -ForegroundColor Cyan
        } else {
            Write-Host "  [INFO] $function has no invocations" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [SKIP] Cannot get metrics for $function" -ForegroundColor Gray
    }
}

# Check 4: Recent Errors
Write-Host "`n[4/5] Checking for errors (last 24h)..." -ForegroundColor Yellow
foreach ($function in $functions) {
    try {
        $errors = aws cloudwatch get-metric-statistics `
            --namespace AWS/Lambda `
            --metric-name Errors `
            --dimensions Name=FunctionName,Value=$function `
            --start-time $since `
            --end-time (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") `
            --period 86400 `
            --statistics Sum 2>&1 | ConvertFrom-Json
        
        if ($errors.Datapoints.Count -gt 0) {
            $errorCount = ($errors.Datapoints | Measure-Object -Property Sum -Sum).Sum
            if ($errorCount -gt 0) {
                Write-Host "  [ERROR] $function has $errorCount errors!" -ForegroundColor Red
            } else {
                Write-Host "  [OK] $function has no errors" -ForegroundColor Green
            }
        } else {
            Write-Host "  [INFO] No error metrics available" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [SKIP] Cannot get error metrics" -ForegroundColor Gray
    }
}

# Check 5: API Gateway Integration
Write-Host "`n[5/5] Checking API Gateway..." -ForegroundColor Yellow
try {
    $apis = aws apigateway get-rest-apis 2>&1 | ConvertFrom-Json
    $api = $apis.items | Where-Object { $_.name -like "*onewordaday*production*" } | Select-Object -First 1
    
    if ($api) {
        Write-Host "  [OK] API Gateway found: $($api.name)" -ForegroundColor Green
        Write-Host "       API ID: $($api.id)" -ForegroundColor Gray
        
        # Check if deployed
        $deployments = aws apigateway get-deployments --rest-api-id $api.id 2>&1 | ConvertFrom-Json
        if ($deployments.items.Count -gt 0) {
            Write-Host "  [OK] API has $($deployments.items.Count) deployment(s)" -ForegroundColor Green
            $latest = $deployments.items | Sort-Object -Property createdDate -Descending | Select-Object -First 1
            Write-Host "       Latest: $(([DateTime]$latest.createdDate).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
        } else {
            Write-Host "  [WARNING] API has no deployments!" -ForegroundColor Red
            Write-Host "       You need to deploy the API Gateway" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ERROR] API Gateway not found!" -ForegroundColor Red
    }
} catch {
    Write-Host "  [ERROR] Cannot check API Gateway: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nCommon 502 causes:" -ForegroundColor Yellow
Write-Host "  1. Lambda function not deployed or updated" -ForegroundColor White
Write-Host "  2. Lambda function timing out or crashing" -ForegroundColor White
Write-Host "  3. Missing environment variables in Lambda" -ForegroundColor White
Write-Host "  4. IAM permission issues (Lambda can't access DynamoDB)" -ForegroundColor White
Write-Host "  5. API Gateway not deployed after changes" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Check CloudWatch logs: .\check-logs.ps1" -ForegroundColor White
Write-Host "  2. Rebuild and deploy: cd backend && npm run build" -ForegroundColor White
Write-Host "  3. Apply Terraform: cd terraform && terraform apply" -ForegroundColor White
Write-Host "  4. Test the endpoints again" -ForegroundColor White
Write-Host ""

