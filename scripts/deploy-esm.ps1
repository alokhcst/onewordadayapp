#!/usr/bin/env pwsh
# Complete deployment script for ESM Lambda functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying ESM Lambda Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

try {
    # Step 1: Rebuild Lambda layer with ESM support
    Write-Host "`n[1/4] Rebuilding Lambda layer with ESM support..." -ForegroundColor Yellow
    .\rebuild-layer-esm.ps1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Layer rebuild failed!"
    }
    
    Write-Host "`n[2/4] Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location -Path "..\backend"
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed!"
    }
    
    Write-Host "`n[3/4] Building Lambda functions..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed!"
    }
    
    # Verify builds
    $zipFiles = Get-ChildItem "dist\*.zip"
    Write-Host "  Built $($zipFiles.Count) functions:" -ForegroundColor Gray
    foreach ($zip in $zipFiles) {
        $sizeKB = [math]::Round($zip.Length / 1KB, 2)
        Write-Host "    [OK] $($zip.Name) ($sizeKB KB)" -ForegroundColor Green
    }
    
    Write-Host "`n[4/4] Deploying to AWS with Terraform..." -ForegroundColor Yellow
    Set-Location -Path "..\terraform"
    
    Write-Host "  Running terraform plan..." -ForegroundColor Gray
    terraform plan -out=tfplan
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform plan failed!"
    }
    
    Write-Host "`n  Applying Terraform changes..." -ForegroundColor Gray
    terraform apply tfplan
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform apply failed!"
    }
    
    # Clean up plan file
    if (Test-Path "tfplan") {
        Remove-Item "tfplan"
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`nWhat was deployed:" -ForegroundColor Yellow
    Write-Host "  [OK] Lambda layer with ESM support (UUID v10.x)" -ForegroundColor White
    Write-Host "  [OK] All Lambda functions converted to ES Modules" -ForegroundColor White
    Write-Host "  [OK] AI-powered word generation with images" -ForegroundColor White
    Write-Host "  [OK] Infrastructure updated on AWS" -ForegroundColor White
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Wait 30-60 seconds for AWS to propagate changes" -ForegroundColor White
    Write-Host "  2. Refresh your web app" -ForegroundColor White
    Write-Host "  3. Test 'Get Next Word' button" -ForegroundColor White
    Write-Host "  4. Test feedback submission" -ForegroundColor White
    Write-Host "  5. Check logs if needed: ..\scripts\check-logs.ps1" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "`n[ERROR] Deployment failed: $_" -ForegroundColor Red
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

