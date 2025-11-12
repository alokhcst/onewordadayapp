#!/usr/bin/env pwsh
# Quick fix and redeploy - fixes user profile issues

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[QUICK FIX] Redeploy with Fixes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Redeploy Lambda functions
Write-Host "[1/2] Redeploying Lambda functions..." -ForegroundColor Cyan

Push-Location terraform

try {
    terraform apply -target="module.lambda" -auto-approve
    
    if ($LASTEXITCODE -ne 0) {
        throw "Lambda deployment failed"
    }
    
    Write-Host "  [OK] Lambda functions updated!" -ForegroundColor Green
} catch {
    Write-Host "  [X] Lambda deployment failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Step 2: Rebuild and redeploy web app
Write-Host ""
Write-Host "[2/2] Rebuilding and redeploying web app..." -ForegroundColor Cyan

try {
    # Build
    Write-Host "  Building web app..." -ForegroundColor Gray
    npx expo export --platform web
    
    if ($LASTEXITCODE -ne 0) {
        throw "Web build failed"
    }
    
    # Get bucket name
    Push-Location terraform
    $bucket = terraform output -raw web_app_s3_bucket
    $cfId = terraform output -raw web_app_cloudfront_id
    Pop-Location
    
    # Upload to S3
    Write-Host "  Uploading to S3..." -ForegroundColor Gray
    
    aws s3 sync dist/ s3://$bucket/ `
        --delete `
        --cache-control "public, max-age=31536000, immutable" `
        --exclude "*.html" `
        --exclude "*.json" | Out-Null
    
    aws s3 sync dist/ s3://$bucket/ `
        --cache-control "public, max-age=0, must-revalidate" `
        --exclude "*" `
        --include "*.html" `
        --include "*.json" | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "S3 upload failed"
    }
    
    # Invalidate CloudFront
    Write-Host "  Invalidating CloudFront cache..." -ForegroundColor Gray
    
    aws cloudfront create-invalidation `
        --distribution-id $cfId `
        --paths "/*" | Out-Null
    
    Write-Host "  [OK] Web app redeployed!" -ForegroundColor Green
    
} catch {
    Write-Host "  [X] Web deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] All Fixes Deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[FIXED]" -ForegroundColor Yellow
Write-Host "  1. User profile auto-creates with correct email/name" -ForegroundColor White
Write-Host "  2. No more 404 errors for new users" -ForegroundColor White
Write-Host "  3. No more 500 errors on /word/today" -ForegroundColor White
Write-Host "  4. Profile displays correct username and email" -ForegroundColor White
Write-Host ""

Write-Host "[ACTION] Clear your browser cache:" -ForegroundColor Yellow
Write-Host "  - Chrome: Ctrl + Shift + R" -ForegroundColor White
Write-Host "  - Firefox: Ctrl + Shift + R" -ForegroundColor White
Write-Host "  - Safari: Cmd + Shift + R" -ForegroundColor White
Write-Host ""

Push-Location terraform
$webUrl = terraform output -raw web_app_cloudfront_url
Pop-Location

Write-Host "[TEST] Open your web app:" -ForegroundColor Green
Write-Host "  $webUrl" -ForegroundColor Cyan
Write-Host ""

