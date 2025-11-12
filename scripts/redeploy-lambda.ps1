#!/usr/bin/env pwsh
# Quick Lambda function redeployment

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[REDEPLOY] Lambda Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to terraform directory
Push-Location terraform

try {
    Write-Host "[1/2] Updating Lambda functions..." -ForegroundColor Cyan
    
    # Target only Lambda module for faster deployment
    terraform apply -target="module.lambda" -auto-approve
    
    if ($LASTEXITCODE -ne 0) {
        throw "Lambda deployment failed"
    }
    
    Write-Host "  [OK] Lambda functions updated!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[2/2] Verification..." -ForegroundColor Cyan
    
    # Get function names
    $functions = @(
        "onewordaday-get-todays-word",
        "onewordaday-submit-feedback",
        "onewordaday-get-history",
        "onewordaday-update-user-profile",
        "onewordaday-get-user-profile"
    )
    
    Write-Host "  Updated functions:" -ForegroundColor Gray
    foreach ($func in $functions) {
        try {
            $version = aws lambda get-function --function-name $func --query 'Configuration.LastModified' --output text 2>$null
            if ($version) {
                Write-Host "    [OK] $func" -ForegroundColor Green
            }
        } catch {
            Write-Host "    [?] $func (could not verify)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Lambda Functions Redeployed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "[TIP] Clear your browser cache and refresh the web app" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "  [X] Deployment failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

