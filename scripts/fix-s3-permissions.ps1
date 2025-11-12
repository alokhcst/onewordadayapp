#!/usr/bin/env pwsh
# Fix S3 bucket permissions for web hosting

param(
    [string]$BucketName = "onewordaday-web-prod"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[FIX] S3 Bucket Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Disable Block Public Access
Write-Host "[1/3] Disabling Block Public Access..." -ForegroundColor Cyan

try {
    aws s3api put-public-access-block `
        --bucket $BucketName `
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
    
    Write-Host "  [OK] Public access block disabled" -ForegroundColor Green
} catch {
    Write-Host "  [X] Failed to disable public access block: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Apply Bucket Policy
Write-Host ""
Write-Host "[2/3] Applying bucket policy..." -ForegroundColor Cyan

# Create bucket policy JSON
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@

# Save policy to temp file
$policyFile = "bucket-policy-temp.json"
$policy | Out-File -FilePath $policyFile -Encoding UTF8

try {
    aws s3api put-bucket-policy --bucket $BucketName --policy file://$policyFile
    
    Write-Host "  [OK] Bucket policy applied" -ForegroundColor Green
} catch {
    Write-Host "  [X] Failed to apply bucket policy: $_" -ForegroundColor Red
    Remove-Item $policyFile -ErrorAction SilentlyContinue
    exit 1
}

# Clean up temp file
Remove-Item $policyFile -ErrorAction SilentlyContinue

# Step 3: Verify Website Configuration
Write-Host ""
Write-Host "[3/3] Verifying website configuration..." -ForegroundColor Cyan

try {
    $websiteConfig = aws s3api get-bucket-website --bucket $BucketName --output json | ConvertFrom-Json
    
    if ($websiteConfig.IndexDocument.Suffix -eq "index.html") {
        Write-Host "  [OK] Website configuration is correct" -ForegroundColor Green
    } else {
        Write-Host "  [!] Website configuration needs updating" -ForegroundColor Yellow
        
        # Configure website hosting
        aws s3 website s3://$BucketName `
            --index-document index.html `
            --error-document index.html
        
        Write-Host "  [OK] Website configuration updated" -ForegroundColor Green
    }
} catch {
    Write-Host "  [!] Website not configured, setting up..." -ForegroundColor Yellow
    
    # Configure website hosting
    aws s3 website s3://$BucketName `
        --index-document index.html `
        --error-document index.html
    
    Write-Host "  [OK] Website configuration applied" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Permissions Fixed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Your website should now be accessible at:" -ForegroundColor White
Write-Host "   http://$BucketName.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "[TIP] If you still see 403, wait 1-2 minutes for AWS to propagate changes" -ForegroundColor Yellow
Write-Host ""

