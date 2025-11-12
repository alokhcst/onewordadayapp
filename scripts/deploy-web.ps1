#!/usr/bin/env pwsh
# Deploy web app to AWS S3 + CloudFront

param(
    [string]$Environment = "prod",
    [string]$BucketName = "",
    [switch]$SkipBuild,
    [switch]$SkipInvalidation,
    [switch]$UseTerraform
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host ">>> Deploying One Word A Day Web App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Get bucket name and CloudFront ID from Terraform if needed
if ($UseTerraform -or !$BucketName) {
    Write-Host ""
    Write-Host "Getting deployment info from Terraform..." -ForegroundColor Cyan
    
    Push-Location terraform
    
    try {
        # Get outputs
        $tfOutputs = terraform output -json | ConvertFrom-Json
        
        if (!$BucketName) {
            $BucketName = $tfOutputs.web_app_s3_bucket.value
            Write-Host "  Bucket from Terraform: $BucketName" -ForegroundColor Gray
        }
        
        $script:CloudFrontId = $tfOutputs.web_app_cloudfront_id.value
        Write-Host "  CloudFront ID: $script:CloudFrontId" -ForegroundColor Gray
        
    } catch {
        Write-Host "  [!] Could not get Terraform outputs: $_" -ForegroundColor Yellow
        Write-Host "  Make sure you've run 'terraform apply' first" -ForegroundColor Yellow
        
        if (!$BucketName) {
            $BucketName = "onewordaday-web-$Environment"
            Write-Host "  Using default bucket name: $BucketName" -ForegroundColor Gray
        }
    } finally {
        Pop-Location
    }
}

if (!$BucketName) {
    $BucketName = "onewordaday-web-$Environment"
}

Write-Host "S3 Bucket: $BucketName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build
if (!$SkipBuild) {
    Write-Host "[1/4] Building web app..." -ForegroundColor Cyan
    
    try {
        # Use expo export with --platform web for Metro bundler
        npx expo export --platform web
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build command failed"
        }
        
        Write-Host "  [OK] Build complete!" -ForegroundColor Green
    } catch {
        Write-Host "  [X] Build failed: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/4] Skipping build (using existing dist/)..." -ForegroundColor Yellow
}

# Verify dist folder exists
if (!(Test-Path "dist")) {
    Write-Host "  [X] dist/ folder not found! Run build first." -ForegroundColor Red
    exit 1
}

# Step 2: Check S3 bucket exists
Write-Host ""
Write-Host "[2/4] Checking S3 bucket..." -ForegroundColor Cyan

try {
    aws s3 ls s3://$BucketName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Bucket doesn't exist, creating..." -ForegroundColor Yellow
        aws s3 mb s3://$BucketName --region us-east-1
        
        # Enable static website hosting
        aws s3 website s3://$BucketName `
            --index-document index.html `
            --error-document index.html
        
        Write-Host "  [OK] Bucket created!" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Bucket exists!" -ForegroundColor Green
    }
} catch {
    Write-Host "  [X] Error checking/creating bucket: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Upload to S3
Write-Host ""
Write-Host "[3/4] Uploading to S3..." -ForegroundColor Cyan

try {
    # Upload static assets with long cache (1 year)
    Write-Host "  Uploading static assets..." -ForegroundColor Gray
    aws s3 sync dist/ s3://$BucketName/ `
        --delete `
        --cache-control "public, max-age=31536000, immutable" `
        --exclude "*.html" `
        --exclude "*.json"
    
    # Upload HTML and JSON files with no cache
    Write-Host "  Uploading HTML files..." -ForegroundColor Gray
    aws s3 sync dist/ s3://$BucketName/ `
        --cache-control "public, max-age=0, must-revalidate" `
        --exclude "*" `
        --include "*.html" `
        --include "*.json"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Upload failed"
    }
    
    Write-Host "  [OK] Upload complete!" -ForegroundColor Green
} catch {
    Write-Host "  [X] Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Invalidate CloudFront cache
if (!$SkipInvalidation) {
    Write-Host ""
    Write-Host "[4/4] Invalidating CloudFront cache..." -ForegroundColor Cyan
    
    try {
        # Use CloudFront ID from Terraform if available, otherwise find it
        $distributionId = $script:CloudFrontId
        
        if (!$distributionId) {
            Write-Host "  Finding CloudFront distribution..." -ForegroundColor Gray
            $distributionId = aws cloudfront list-distributions `
                --query "DistributionList.Items[?Origins.Items[0].DomainName==contains(@,'$BucketName')].Id" `
                --output text
        }
        
        if ($distributionId -and $distributionId.Trim()) {
            Write-Host "  Using distribution: $distributionId" -ForegroundColor Gray
            
            $invalidation = aws cloudfront create-invalidation `
                --distribution-id $distributionId `
                --paths "/*" `
                --output json | ConvertFrom-Json
            
            Write-Host "  Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor Gray
            Write-Host "  [OK] Cache invalidation started!" -ForegroundColor Green
        } else {
            Write-Host "  [!] No CloudFront distribution found, skipping..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [!] Warning: Could not invalidate CloudFront cache: $_" -ForegroundColor Yellow
        Write-Host "  This is not critical - new content will be served eventually" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "[4/4] Skipping CloudFront invalidation..." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Your web app is available at:" -ForegroundColor White
Write-Host "   S3 Website: http://$BucketName.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan

# Try to get CloudFront URL
try {
    $cfDomain = aws cloudfront list-distributions `
        --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BucketName.s3.amazonaws.com'].DomainName" `
        --output text
    
    if ($cfDomain -and $cfDomain.Trim()) {
        Write-Host "   CloudFront: https://$cfDomain" -ForegroundColor Cyan
    }
} catch {
    # Ignore errors getting CloudFront URL
}

Write-Host ""
Write-Host "[TIP] Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test the web app in your browser" -ForegroundColor White
Write-Host "   2. Configure custom domain (optional)" -ForegroundColor White
Write-Host "   3. Set up SSL certificate with ACM (optional)" -ForegroundColor White
Write-Host ""

