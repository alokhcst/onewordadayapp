#!/usr/bin/env pwsh
# Add DNS CNAME record for custom domain

param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [string]$HostedZoneId = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[SETUP] DNS CNAME Record" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get CloudFront domain
Write-Host "[1/4] Getting CloudFront domain..." -ForegroundColor Cyan

Push-Location terraform

try {
    $cloudFrontDomain = terraform output -raw cloudfront_domain_name 2>$null
    
    if (!$cloudFrontDomain) {
        # Try alternate output name
        $cloudFrontUrl = terraform output -raw web_app_cloudfront_url 2>$null
        if ($cloudFrontUrl) {
            $cloudFrontDomain = $cloudFrontUrl -replace 'https://', ''
        }
    }
    
    if (!$cloudFrontDomain) {
        Write-Host "  [X] Could not find CloudFront domain in Terraform outputs" -ForegroundColor Red
        Write-Host "  Run 'terraform apply' first" -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
    
    Write-Host "  CloudFront Domain: $cloudFrontDomain" -ForegroundColor Green
    
} catch {
    Write-Host "  [X] Error getting CloudFront domain: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Step 2: Find hosted zone
Write-Host ""
Write-Host "[2/4] Finding Route 53 Hosted Zone..." -ForegroundColor Cyan

try {
    # Extract root domain (e.g., darptech.com from app.darptech.com)
    $rootDomain = $DomainName
    if ($DomainName -match '\.') {
        $parts = $DomainName -split '\.'
        if ($parts.Length -gt 2) {
            $rootDomain = $parts[-2] + '.' + $parts[-1]
        }
    }
    
    Write-Host "  Looking for hosted zone: $rootDomain" -ForegroundColor Gray
    
    if (!$HostedZoneId) {
        $hostedZones = aws route53 list-hosted-zones --output json | ConvertFrom-Json
        
        $matchingZone = $hostedZones.HostedZones | Where-Object { 
            $_.Name -eq "$rootDomain." 
        } | Select-Object -First 1
        
        if ($matchingZone) {
            $HostedZoneId = $matchingZone.Id -replace '/hostedzone/', ''
            Write-Host "  [OK] Found hosted zone: $HostedZoneId" -ForegroundColor Green
        } else {
            Write-Host "  [!] Hosted zone not found for $rootDomain" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  Available hosted zones:" -ForegroundColor Gray
            $hostedZones.HostedZones | ForEach-Object {
                Write-Host "    - $($_.Name) (ID: $($_.Id -replace '/hostedzone/', ''))" -ForegroundColor Gray
            }
            Write-Host ""
            $HostedZoneId = Read-Host "  Enter Hosted Zone ID"
        }
    }
    
} catch {
    Write-Host "  [X] Error finding hosted zone: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create DNS record
Write-Host ""
Write-Host "[3/4] Creating DNS record..." -ForegroundColor Cyan

# Determine if this is apex domain or subdomain
$isApex = ($DomainName -notmatch '^\w+\.')

if ($isApex) {
    Write-Host "  Creating A-Alias record (apex domain)" -ForegroundColor Gray
    
    # Create change batch for A-Alias record
    $changeBatch = @"
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DomainName",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$cloudFrontDomain",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
"@
} else {
    Write-Host "  Creating CNAME record (subdomain)" -ForegroundColor Gray
    
    # Create change batch for CNAME
    $changeBatch = @"
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DomainName",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "$cloudFrontDomain"
          }
        ]
      }
    }
  ]
}
"@
}

# Save to temp file
$batchFile = "dns-change-batch-temp.json"
$changeBatch | Out-File -FilePath $batchFile -Encoding UTF8

try {
    $changeInfo = aws route53 change-resource-record-sets `
        --hosted-zone-id $HostedZoneId `
        --change-batch file://$batchFile `
        --output json | ConvertFrom-Json
    
    Write-Host "  [OK] DNS record created!" -ForegroundColor Green
    Write-Host "  Change ID: $($changeInfo.ChangeInfo.Id)" -ForegroundColor Gray
    
} catch {
    Write-Host "  [X] Failed to create DNS record: $_" -ForegroundColor Red
    Remove-Item $batchFile -ErrorAction SilentlyContinue
    exit 1
}

# Clean up
Remove-Item $batchFile -ErrorAction SilentlyContinue

# Step 4: Wait for DNS propagation
Write-Host ""
Write-Host "[4/4] Waiting for DNS propagation..." -ForegroundColor Cyan

$changeId = $changeInfo.ChangeInfo.Id

for ($i = 1; $i -le 12; $i++) {
    Start-Sleep -Seconds 5
    
    try {
        $status = aws route53 get-change `
            --id $changeId `
            --query "ChangeInfo.Status" `
            --output text
        
        Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "INSYNC") { "Green" } else { "Yellow" })
        
        if ($status -eq "INSYNC") {
            break
        }
    } catch {
        Write-Host "  Checking..." -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] DNS Record Added!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domain:          $DomainName" -ForegroundColor White
Write-Host "Points to:       $cloudFrontDomain" -ForegroundColor White
Write-Host "Hosted Zone ID:  $HostedZoneId" -ForegroundColor White
Write-Host ""
Write-Host "[TIP] DNS propagation may take 5-10 minutes" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test your domain:" -ForegroundColor White
Write-Host "  https://$DomainName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check DNS propagation:" -ForegroundColor White
Write-Host "  nslookup $DomainName" -ForegroundColor Gray
Write-Host ""

