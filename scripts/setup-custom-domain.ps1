#!/usr/bin/env pwsh
# Setup custom domain for web app

param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [string]$Region = "us-east-1"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[SETUP] Custom Domain Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Domain: $DomainName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Step 1: Request certificate
Write-Host "[1/4] Requesting SSL certificate..." -ForegroundColor Cyan

try {
    $certArn = aws acm request-certificate `
        --domain-name $DomainName `
        --validation-method DNS `
        --region $Region `
        --query "CertificateArn" `
        --output text
    
    Write-Host "  [OK] Certificate requested" -ForegroundColor Green
    Write-Host "  ARN: $certArn" -ForegroundColor Gray
} catch {
    Write-Host "  [X] Failed to request certificate: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Get validation records
Write-Host "[2/4] Getting DNS validation records..." -ForegroundColor Cyan
Write-Host "  Waiting for validation details..." -ForegroundColor Gray

Start-Sleep -Seconds 3

try {
    $certDetails = aws acm describe-certificate `
        --certificate-arn $certArn `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $validationRecord = $certDetails.Certificate.DomainValidationOptions[0].ResourceRecord
    
    Write-Host ""
    Write-Host "  [ACTION REQUIRED] Add this CNAME record to your DNS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Record Type: CNAME" -ForegroundColor White
    Write-Host "    Name:        $($validationRecord.Name)" -ForegroundColor Cyan
    Write-Host "    Value:       $($validationRecord.Value)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "  [!] Could not retrieve validation records yet" -ForegroundColor Yellow
    Write-Host "  Run this command to get them:" -ForegroundColor Gray
    Write-Host "  aws acm describe-certificate --certificate-arn $certArn --region $Region" -ForegroundColor Gray
}

# Step 3: Wait for validation
Write-Host ""
Write-Host "[3/4] Waiting for certificate validation..." -ForegroundColor Cyan
Write-Host "  This may take 5-30 minutes" -ForegroundColor Gray
Write-Host ""

$maxAttempts = 36  # 6 minutes (36 * 10 seconds)
$validated = $false

for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 10
    
    try {
        $status = aws acm describe-certificate `
            --certificate-arn $certArn `
            --region $Region `
            --query "Certificate.Status" `
            --output text
        
        Write-Host "  Attempt $i/$maxAttempts - Status: $status" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } else { "Yellow" })
        
        if ($status -eq "ISSUED") {
            $validated = $true
            Write-Host ""
            Write-Host "  [OK] Certificate validated!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Checking..." -ForegroundColor Gray
    }
}

if (!$validated) {
    Write-Host ""
    Write-Host "  [!] Certificate validation taking longer than expected" -ForegroundColor Yellow
    Write-Host "  Please ensure DNS record is added correctly" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Check status with:" -ForegroundColor Gray
    Write-Host "  aws acm describe-certificate --certificate-arn $certArn --region $Region" -ForegroundColor Gray
    Write-Host ""
}

# Step 4: Instructions
Write-Host ""
Write-Host "[4/4] Next Steps" -ForegroundColor Cyan
Write-Host ""

Write-Host "  1. Update terraform/main.tf module configuration:" -ForegroundColor White
Write-Host ""
Write-Host "     module `"web_hosting`" {" -ForegroundColor Gray
Write-Host "       source = `"./modules/web-hosting`"" -ForegroundColor Gray
Write-Host "       ..." -ForegroundColor Gray
Write-Host "       acm_certificate_arn = `"$certArn`"" -ForegroundColor Cyan
Write-Host "       custom_domain       = `"$DomainName`"" -ForegroundColor Cyan
Write-Host "     }" -ForegroundColor Gray
Write-Host ""

Write-Host "  2. Apply Terraform changes:" -ForegroundColor White
Write-Host "     cd terraform" -ForegroundColor Gray
Write-Host "     terraform apply" -ForegroundColor Gray
Write-Host ""

Write-Host "  3. Add DNS CNAME record in Route 53:" -ForegroundColor White
Write-Host "     Name:  $DomainName" -ForegroundColor Gray
Write-Host "     Type:  CNAME (or A-Alias)" -ForegroundColor Gray
Write-Host "     Value: [Your CloudFront domain from terraform output]" -ForegroundColor Gray
Write-Host ""

Write-Host "  4. Wait 5-10 minutes for DNS propagation" -ForegroundColor White
Write-Host ""

Write-Host "  5. Test your secure domain:" -ForegroundColor White
Write-Host "     https://$DomainName" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[INFO] Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Certificate ARN (save this):" -ForegroundColor Yellow
Write-Host $certArn -ForegroundColor White
Write-Host ""
Write-Host "Domain:" -ForegroundColor Yellow
Write-Host $DomainName -ForegroundColor White
Write-Host ""
Write-Host "Status:" -ForegroundColor Yellow
if ($validated) {
    Write-Host "Certificate is validated and ready!" -ForegroundColor Green
} else {
    Write-Host "Waiting for DNS validation..." -ForegroundColor Yellow
}
Write-Host ""

