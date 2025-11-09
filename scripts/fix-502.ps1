#!/usr/bin/env pwsh
# Comprehensive fix for 502 Bad Gateway errors
# This fixes the UUID ESM module incompatibility issue

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing 502 Bad Gateway Errors" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nIssue: uuid package ESM incompatibility" -ForegroundColor Yellow
Write-Host "Fix: Rebuild Lambda layer with uuid v8.x (CommonJS)`n" -ForegroundColor Yellow

$ErrorActionPreference = "Stop"

try {
    # Step 1: Rebuild Lambda layer with correct uuid version
    Write-Host "[1/3] Rebuilding Lambda layer with uuid v8.x..." -ForegroundColor Yellow
    Set-Location -Path "..\backend"
    
    # Remove old layer
    if (Test-Path "layers") {
        Write-Host "  Removing old layer..." -ForegroundColor Gray
        Remove-Item -Recurse -Force layers
    }
    
    # Create layer directory
    Write-Host "  Creating layer structure..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path "layers\nodejs" -Force | Out-Null
    
    Set-Location -Path "layers\nodejs"
    
    # Initialize package.json
    Write-Host "  Initializing package.json..." -ForegroundColor Gray
    npm init -y 2>&1 | Out-Null
    
    # Install dependencies with uuid v8.x (CommonJS compatible)
    Write-Host "  Installing dependencies (uuid v8.x for CommonJS)..." -ForegroundColor Gray
    npm install @aws-sdk/client-dynamodb@^3.540.0 `
        @aws-sdk/lib-dynamodb@^3.540.0 `
        @aws-sdk/client-s3@^3.540.0 `
        @aws-sdk/client-sns@^3.540.0 `
        @aws-sdk/client-ses@^3.540.0 `
        @aws-sdk/client-bedrock-runtime@^3.540.0 `
        @aws-sdk/client-secrets-manager@^3.540.0 `
        @aws-sdk/client-lambda@^3.540.0 `
        axios@^1.6.7 `
        uuid@8.3.2 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed!"
    }
    
    Write-Host "  [OK] Dependencies installed!" -ForegroundColor Green
    
    # Create zip
    Set-Location -Path ".."
    Write-Host "  Creating dependencies.zip..." -ForegroundColor Gray
    
    if (Test-Path "dependencies.zip") {
        Remove-Item "dependencies.zip"
    }
    
    Compress-Archive -Path "nodejs" -DestinationPath "dependencies.zip" -Force
    
    $zipSize = [math]::Round((Get-Item "dependencies.zip").Length / 1MB, 2)
    Write-Host "  [OK] Layer created: $zipSize MB" -ForegroundColor Green
    
    # Step 2: Rebuild Lambda functions
    Write-Host "`n[2/3] Rebuilding Lambda functions..." -ForegroundColor Yellow
    Set-Location -Path ".."
    
    Write-Host "  Installing dependencies..." -ForegroundColor Gray
    npm install --silent
    
    Write-Host "  Building functions..." -ForegroundColor Gray
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed!"
    }
    
    Write-Host "  [OK] Lambda functions built!" -ForegroundColor Green
    
    # Verify builds
    $zipFiles = Get-ChildItem "dist\*.zip"
    Write-Host "  Built $($zipFiles.Count) functions:" -ForegroundColor Gray
    foreach ($zip in $zipFiles) {
        $sizeKB = [math]::Round($zip.Length / 1KB, 2)
        Write-Host "    - $($zip.Name) ($sizeKB KB)" -ForegroundColor Gray
    }
    
    # Step 3: Deploy infrastructure
    Write-Host "`n[3/3] Deploying to AWS..." -ForegroundColor Yellow
    Set-Location -Path "..\terraform"
    
    Write-Host "  Running terraform apply..." -ForegroundColor Gray
    Write-Host "  (This may take a few minutes...)" -ForegroundColor Gray
    terraform apply -auto-approve
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform apply failed!"
    }
    
    Write-Host "  [OK] Infrastructure deployed!" -ForegroundColor Green
    
    # Verify deployment
    Write-Host "`nVerifying deployment..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $functions = @(
        "onewordaday-production-feedback-processor",
        "onewordaday-production-get-todays-word"
    )
    
    foreach ($function in $functions) {
        try {
            $config = aws lambda get-function-configuration --function-name $function 2>&1 | ConvertFrom-Json
            $lastModified = [DateTime]::Parse($config.LastModified)
            $minutesAgo = [math]::Round(((Get-Date).ToUniversalTime() - $lastModified).TotalMinutes, 1)
            
            if ($minutesAgo -lt 10) {
                Write-Host "  [OK] $function updated $minutesAgo min ago" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] $function last updated $minutesAgo min ago" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  [SKIP] Cannot verify $function" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`nWhat was fixed:" -ForegroundColor Yellow
    Write-Host "  - Rebuilt Lambda layer with uuid v8.3.2 (CommonJS compatible)" -ForegroundColor White
    Write-Host "  - Rebuilt all Lambda functions" -ForegroundColor White
    Write-Host "  - Deployed updated code to AWS" -ForegroundColor White
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Wait 30-60 seconds for AWS to propagate changes" -ForegroundColor White
    Write-Host "  2. Refresh your mobile app" -ForegroundColor White
    Write-Host "  3. Try the action again (feedback submission, get next word)" -ForegroundColor White
    Write-Host "  4. If still failing, check logs: .\check-logs.ps1" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "`n[ERROR] Fix failed: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Check AWS credentials: aws sts get-caller-identity" -ForegroundColor White
    Write-Host "  - Check Node.js is installed: node --version" -ForegroundColor White
    Write-Host "  - Check Terraform is installed: terraform --version" -ForegroundColor White
    Write-Host "  - Review error messages above" -ForegroundColor White
    Write-Host ""
    Set-Location -Path $PSScriptRoot
    exit 1
} finally {
    # Return to scripts directory
    Set-Location -Path $PSScriptRoot
}
