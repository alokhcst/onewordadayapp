#!/usr/bin/env pwsh
# Get secure web app URLs

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[INFO] Web App URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Push-Location terraform

try {
    # Get CloudFront URL (HTTPS - Secure)
    $cloudFrontUrl = terraform output -raw web_app_cloudfront_url 2>$null
    
    if ($cloudFrontUrl) {
        Write-Host "[SECURE] CloudFront URL (HTTPS):" -ForegroundColor Green
        Write-Host "  $cloudFrontUrl" -ForegroundColor Cyan
        Write-Host ""
    }
    
    # Get S3 URL (HTTP only)
    $s3Url = terraform output -raw web_app_s3_url 2>$null
    
    if ($s3Url) {
        Write-Host "[BASIC] S3 Website URL (HTTP only):" -ForegroundColor Yellow
        Write-Host "  $s3Url" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Get CloudFront Distribution ID
    $cfId = terraform output -raw web_app_cloudfront_id 2>$null
    
    if ($cfId) {
        Write-Host "[INFO] CloudFront Distribution ID:" -ForegroundColor White
        Write-Host "  $cfId" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Get S3 Bucket Name
    $bucket = terraform output -raw web_app_s3_bucket 2>$null
    
    if ($bucket) {
        Write-Host "[INFO] S3 Bucket:" -ForegroundColor White
        Write-Host "  $bucket" -ForegroundColor Gray
        Write-Host ""
    }
    
    if (!$cloudFrontUrl -and !$s3Url) {
        Write-Host "[!] No web hosting outputs found" -ForegroundColor Yellow
        Write-Host "Run 'terraform apply' first to create web hosting infrastructure" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Host "[X] Error getting outputs: $_" -ForegroundColor Red
    Write-Host ""
}

Pop-Location

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[TIP] Use the CloudFront URL for secure HTTPS access!" -ForegroundColor Yellow
Write-Host ""

