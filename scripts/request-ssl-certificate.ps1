#!/usr/bin/env pwsh
# Request SSL certificate for custom domain

param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [string]$Region = "us-east-1"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[SSL] Request Certificate for $DomainName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check existing certificates
Write-Host "[1/4] Checking for existing certificates..." -ForegroundColor Cyan

try {
    $existingCerts = aws acm list-certificates --region $Region --output json | ConvertFrom-Json
    
    $matching = $existingCerts.CertificateSummaryList | Where-Object { 
        $_.DomainName -eq $DomainName 
    }
    
    if ($matching) {
        Write-Host "  [!] Certificate already exists for $DomainName" -ForegroundColor Yellow
        Write-Host "  ARN: $($matching.CertificateArn)" -ForegroundColor Gray
        Write-Host ""
        
        $useExisting = Read-Host "  Use existing certificate? (yes/no)"
        
        if ($useExisting -eq 'yes') {
            $certArn = $matching.CertificateArn
            
            # Get validation info
            $certDetails = aws acm describe-certificate `
                --certificate-arn $certArn `
                --region $Region `
                --output json | ConvertFrom-Json
            
            $status = $certDetails.Certificate.Status
            
            Write-Host ""
            Write-Host "  Certificate Status: $status" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } else { "Yellow" })
            
            if ($status -ne "ISSUED") {
                Write-Host ""
                Write-Host "  Certificate needs validation!" -ForegroundColor Yellow
                
                $validationRecord = $certDetails.Certificate.DomainValidationOptions[0].ResourceRecord
                
                Write-Host ""
                Write-Host "  Add this DNS record in Squarespace:" -ForegroundColor Cyan
                Write-Host "    Host:  $($validationRecord.Name)" -ForegroundColor White
                Write-Host "    Type:  CNAME" -ForegroundColor White
                Write-Host "    Value: $($validationRecord.Value)" -ForegroundColor White
                Write-Host ""
            }
            
            Write-Host ""
            Write-Host "Certificate ARN:" -ForegroundColor Yellow
            Write-Host $certArn -ForegroundColor White
            Write-Host ""
            exit 0
        }
    } else {
        Write-Host "  No existing certificates found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [!] Error checking certificates: $_" -ForegroundColor Yellow
}

# Step 2: Request new certificate
Write-Host ""
Write-Host "[2/4] Requesting new SSL certificate..." -ForegroundColor Cyan

try {
    $certArn = aws acm request-certificate `
        --domain-name $DomainName `
        --validation-method DNS `
        --region $Region `
        --query "CertificateArn" `
        --output text
    
    if (!$certArn) {
        throw "Failed to get certificate ARN"
    }
    
    Write-Host "  [OK] Certificate requested successfully!" -ForegroundColor Green
    Write-Host "  ARN: $certArn" -ForegroundColor Gray
} catch {
    Write-Host "  [X] Failed to request certificate: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get validation records
Write-Host ""
Write-Host "[3/4] Getting DNS validation records..." -ForegroundColor Cyan
Write-Host "  Waiting for AWS to generate validation records..." -ForegroundColor Gray

Start-Sleep -Seconds 5

try {
    $certDetails = aws acm describe-certificate `
        --certificate-arn $certArn `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $validationRecord = $certDetails.Certificate.DomainValidationOptions[0].ResourceRecord
    
    Write-Host ""
    Write-Host "  [ACTION REQUIRED] Add this DNS record in Squarespace:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ========================================" -ForegroundColor Cyan
    Write-Host "  Host:  $($validationRecord.Name)" -ForegroundColor White
    Write-Host "  Type:  CNAME" -ForegroundColor White
    Write-Host "  Value: $($validationRecord.Value)" -ForegroundColor White
    Write-Host "  TTL:   3600 (or default)" -ForegroundColor White
    Write-Host "  ========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "  How to add this record in Squarespace:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://account.squarespace.com/domains" -ForegroundColor Gray
    Write-Host "  2. Click: darptech.com" -ForegroundColor Gray
    Write-Host "  3. Click: DNS Settings" -ForegroundColor Gray
    Write-Host "  4. Add CNAME record with values above" -ForegroundColor Gray
    Write-Host "  5. Save" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "  [X] Failed to get validation records: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Run this command later to get validation records:" -ForegroundColor Gray
    Write-Host "  aws acm describe-certificate --certificate-arn $certArn --region $Region" -ForegroundColor Gray
    Write-Host ""
}

# Step 4: Wait for validation
Write-Host ""
Write-Host "[4/4] Monitoring certificate validation..." -ForegroundColor Cyan
Write-Host "  This may take 5-30 minutes after adding DNS record" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to exit monitoring (certificate will continue validating)" -ForegroundColor Gray
Write-Host ""

$maxWaitMinutes = 10
$maxAttempts = $maxWaitMinutes * 6  # Check every 10 seconds

for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 10
    
    try {
        $status = aws acm describe-certificate `
            --certificate-arn $certArn `
            --region $Region `
            --query "Certificate.Status" `
            --output text
        
        $elapsed = [math]::Round($i * 10 / 60, 1)
        Write-Host "  [$elapsed min] Status: $status" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } elseif ($status -eq "FAILED") { "Red" } else { "Yellow" })
        
        if ($status -eq "ISSUED") {
            Write-Host ""
            Write-Host "  [OK] Certificate validated successfully!" -ForegroundColor Green
            break
        }
        
        if ($status -eq "FAILED") {
            Write-Host ""
            Write-Host "  [X] Certificate validation failed!" -ForegroundColor Red
            Write-Host "  Check DNS records and try again" -ForegroundColor Yellow
            break
        }
    } catch {
        Write-Host "  Waiting for certificate details..." -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[INFO] Certificate Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domain:         $DomainName" -ForegroundColor White
Write-Host "Region:         $Region" -ForegroundColor White
Write-Host ""
Write-Host "Certificate ARN (save this!):" -ForegroundColor Yellow
Write-Host $certArn -ForegroundColor Cyan
Write-Host ""

# Get current status
try {
    $finalStatus = aws acm describe-certificate `
        --certificate-arn $certArn `
        --region $Region `
        --query "Certificate.Status" `
        --output text
    
    Write-Host "Current Status: $finalStatus" -ForegroundColor $(if ($finalStatus -eq "ISSUED") { "Green" } else { "Yellow" })
} catch {
    Write-Host "Current Status: Pending..." -ForegroundColor Yellow
}

Write-Host ""

if ($finalStatus -eq "ISSUED") {
    Write-Host "[NEXT] Update Terraform configuration:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Edit terraform/main.tf and add to web_hosting module:" -ForegroundColor White
    Write-Host ""
    Write-Host "  acm_certificate_arn = `"$certArn`"" -ForegroundColor Cyan
    Write-Host "  custom_domain       = `"$DomainName`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then run:" -ForegroundColor White
    Write-Host "  terraform apply" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[WAIT] Certificate is still being validated" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Check status with:" -ForegroundColor White
    Write-Host "  aws acm describe-certificate --certificate-arn $certArn --region $Region" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Make sure you added the DNS validation record in Squarespace!" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

