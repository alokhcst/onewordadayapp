#!/usr/bin/env pwsh
# Complete end-to-end deployment script for One Word A Day

param(
    [string]$Environment = "production",
    [switch]$SkipInfrastructure,
    [switch]$SkipBackend,
    [switch]$SkipWeb,
    [switch]$SkipTests,
    [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host ">>> One Word A Day - Complete Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Store original location
$originalLocation = Get-Location

# Track deployment status
$deploymentStatus = @{
    Infrastructure = "Pending"
    Backend = "Pending"
    Secrets = "Pending"
    WebApp = "Pending"
}

# ============================================
# STEP 1: Infrastructure (Terraform)
# ============================================
if (!$SkipInfrastructure) {
    Write-Host "`n[1/4] Deploying Infrastructure (Terraform)..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    
    try {
        Push-Location terraform
        
        # Check if terraform.tfvars exists
        if (!(Test-Path "terraform.tfvars")) {
            Write-Host "  [!] terraform.tfvars not found!" -ForegroundColor Yellow
            Write-Host "  Copying from terraform.tfvars.example..." -ForegroundColor Gray
            
            if (Test-Path "terraform.tfvars.example") {
                Copy-Item "terraform.tfvars.example" "terraform.tfvars"
                Write-Host "  [!] Please edit terraform.tfvars with your values" -ForegroundColor Yellow
                Write-Host "  Then run this script again" -ForegroundColor Yellow
                Pop-Location
                exit 1
            } else {
                throw "terraform.tfvars.example not found"
            }
        }
        
        # Initialize Terraform
        Write-Host "  Initializing Terraform..." -ForegroundColor Gray
        terraform init
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform init failed"
        }
        
        # Validate configuration
        Write-Host "  Validating Terraform configuration..." -ForegroundColor Gray
        terraform validate
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform validation failed"
        }
        
        # Plan changes
        Write-Host "  Planning infrastructure changes..." -ForegroundColor Gray
        terraform plan -out=tfplan
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform plan failed"
        }
        
        # Apply changes
        if ($AutoApprove) {
            Write-Host "  Applying infrastructure changes (auto-approved)..." -ForegroundColor Gray
            terraform apply -auto-approve tfplan
        } else {
            Write-Host ""
            Write-Host "  Review the plan above" -ForegroundColor Yellow
            $confirm = Read-Host "  Apply these changes? (yes/no)"
            
            if ($confirm -ne 'yes') {
                Write-Host "  [!] Infrastructure deployment cancelled" -ForegroundColor Yellow
                Pop-Location
                exit 0
            }
            
            terraform apply tfplan
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform apply failed"
        }
        
        # Clean up plan file
        Remove-Item tfplan -ErrorAction SilentlyContinue
        
        Write-Host "  [OK] Infrastructure deployed successfully!" -ForegroundColor Green
        $deploymentStatus.Infrastructure = "Success"
        
        # Save important outputs
        Write-Host ""
        Write-Host "  Getting infrastructure outputs..." -ForegroundColor Gray
        
        $script:ApiUrl = terraform output -raw api_gateway_url
        $script:UserPoolId = terraform output -raw cognito_user_pool_id
        $script:ClientId = terraform output -raw cognito_client_id
        $script:S3Bucket = terraform output -raw web_app_s3_bucket
        $script:CloudFrontUrl = terraform output -raw web_app_cloudfront_url
        $script:CloudFrontId = terraform output -raw web_app_cloudfront_id
        
        Write-Host "  API Gateway URL: $script:ApiUrl" -ForegroundColor Gray
        Write-Host "  User Pool ID: $script:UserPoolId" -ForegroundColor Gray
        Write-Host "  S3 Bucket: $script:S3Bucket" -ForegroundColor Gray
        Write-Host "  CloudFront URL: $script:CloudFrontUrl" -ForegroundColor Gray
        
    } catch {
        Write-Host "  [X] Infrastructure deployment failed: $_" -ForegroundColor Red
        $deploymentStatus.Infrastructure = "Failed"
        Pop-Location
        exit 1
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/4] Skipping infrastructure deployment..." -ForegroundColor Yellow
    $deploymentStatus.Infrastructure = "Skipped"
    
    # Try to get outputs anyway
    try {
        Push-Location terraform
        $script:ApiUrl = terraform output -raw api_gateway_url 2>$null
        $script:S3Bucket = terraform output -raw web_app_s3_bucket 2>$null
        $script:CloudFrontUrl = terraform output -raw web_app_cloudfront_url 2>$null
        $script:CloudFrontId = terraform output -raw web_app_cloudfront_id 2>$null
        Pop-Location
    } catch {
        Pop-Location
    }
}

# ============================================
# STEP 2: Configure Secrets
# ============================================
if (!$SkipBackend) {
    Write-Host "`n[2/4] Checking API Secrets..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    
    try {
        # Check if secret exists and is valid
        $secretCheck = aws secretsmanager get-secret-value `
            --secret-id "onewordaday/llm-api-keys" `
            --query SecretString `
            --output text 2>$null
        
        if ($secretCheck) {
            try {
                $parsed = $secretCheck | ConvertFrom-Json
                $keys = @($parsed.PSObject.Properties.Name)
                
                Write-Host "  [OK] Secrets configured" -ForegroundColor Green
                Write-Host "  Found keys: $($keys -join ', ')" -ForegroundColor Gray
                $deploymentStatus.Secrets = "Success"
            } catch {
                Write-Host "  [!] Secrets exist but may be malformed" -ForegroundColor Yellow
                Write-Host "  Run: .\scripts\fix-secret.ps1 to fix" -ForegroundColor Gray
                $deploymentStatus.Secrets = "Warning"
            }
        } else {
            Write-Host "  [!] Secrets not configured" -ForegroundColor Yellow
            Write-Host "  Run: .\scripts\fix-secret.ps1 to configure API keys" -ForegroundColor Gray
            $deploymentStatus.Secrets = "NotConfigured"
        }
    } catch {
        Write-Host "  [!] Could not check secrets: $_" -ForegroundColor Yellow
        Write-Host "  You may need to configure API keys later" -ForegroundColor Gray
        $deploymentStatus.Secrets = "Unknown"
    }
}

# ============================================
# STEP 3: Build and Deploy Web App
# ============================================
if (!$SkipWeb) {
    Write-Host "`n[3/4] Building and Deploying Web App..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    
    try {
        # Check if we have bucket name
        if (!$script:S3Bucket) {
            Write-Host "  [!] S3 bucket not found" -ForegroundColor Yellow
            Write-Host "  Run infrastructure deployment first" -ForegroundColor Gray
            $deploymentStatus.WebApp = "Skipped"
        } else {
            # Build web app
            Write-Host "  Building web app..." -ForegroundColor Gray
            npx expo export --platform web
            
            if ($LASTEXITCODE -ne 0) {
                throw "Web build failed"
            }
            
            Write-Host "  [OK] Web build complete" -ForegroundColor Green
            
            # Upload to S3
            Write-Host "  Uploading to S3..." -ForegroundColor Gray
            
            # Upload assets with long cache
            aws s3 sync dist/ s3://$script:S3Bucket/ `
                --delete `
                --cache-control "public, max-age=31536000, immutable" `
                --exclude "*.html" `
                --exclude "*.json" | Out-Null
            
            # Upload HTML/JSON with no cache
            aws s3 sync dist/ s3://$script:S3Bucket/ `
                --cache-control "public, max-age=0, must-revalidate" `
                --exclude "*" `
                --include "*.html" `
                --include "*.json" | Out-Null
            
            if ($LASTEXITCODE -ne 0) {
                throw "S3 upload failed"
            }
            
            Write-Host "  [OK] Files uploaded to S3" -ForegroundColor Green
            
            # Invalidate CloudFront cache
            if ($script:CloudFrontId) {
                Write-Host "  Invalidating CloudFront cache..." -ForegroundColor Gray
                
                $invalidation = aws cloudfront create-invalidation `
                    --distribution-id $script:CloudFrontId `
                    --paths "/*" `
                    --output json 2>$null | ConvertFrom-Json
                
                if ($invalidation) {
                    Write-Host "  [OK] Cache invalidation started" -ForegroundColor Green
                } else {
                    Write-Host "  [!] Could not invalidate cache (not critical)" -ForegroundColor Yellow
                }
            }
            
            $deploymentStatus.WebApp = "Success"
        }
    } catch {
        Write-Host "  [X] Web deployment failed: $_" -ForegroundColor Red
        $deploymentStatus.WebApp = "Failed"
    }
} else {
    Write-Host "`n[3/4] Skipping web deployment..." -ForegroundColor Yellow
    $deploymentStatus.WebApp = "Skipped"
}

# ============================================
# STEP 4: Verification Tests
# ============================================
if (!$SkipTests) {
    Write-Host "`n[4/4] Running Verification Tests..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    
    $testResults = @{
        ApiEndpoint = "Pending"
        WebApp = "Pending"
        Authentication = "Pending"
    }
    
    # Test 1: API Gateway endpoint
    if ($script:ApiUrl) {
        Write-Host "  Testing API Gateway endpoint..." -ForegroundColor Gray
        
        try {
            $response = Invoke-WebRequest -Uri "$script:ApiUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] API Gateway is responding" -ForegroundColor Green
                $testResults.ApiEndpoint = "Success"
            }
        } catch {
            Write-Host "  [!] API Gateway test failed (may need authentication)" -ForegroundColor Yellow
            $testResults.ApiEndpoint = "Warning"
        }
    }
    
    # Test 2: Web app accessibility
    if ($script:CloudFrontUrl) {
        Write-Host "  Testing web app (CloudFront)..." -ForegroundColor Gray
        
        try {
            $response = Invoke-WebRequest -Uri $script:CloudFrontUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] Web app is accessible" -ForegroundColor Green
                $testResults.WebApp = "Success"
            }
        } catch {
            Write-Host "  [!] Web app test failed: $($_.Exception.Message)" -ForegroundColor Yellow
            $testResults.WebApp = "Failed"
        }
    }
    
    # Test 3: Check Cognito configuration
    if ($script:UserPoolId) {
        Write-Host "  Checking Cognito User Pool..." -ForegroundColor Gray
        
        try {
            $userPool = aws cognito-idp describe-user-pool `
                --user-pool-id $script:UserPoolId `
                --output json 2>$null | ConvertFrom-Json
            
            if ($userPool) {
                Write-Host "  [OK] Cognito User Pool configured" -ForegroundColor Green
                $testResults.Authentication = "Success"
            }
        } catch {
            Write-Host "  [!] Could not verify Cognito configuration" -ForegroundColor Yellow
            $testResults.Authentication = "Warning"
        }
    }
} else {
    Write-Host "`n[4/4] Skipping verification tests..." -ForegroundColor Yellow
}

# ============================================
# DEPLOYMENT SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host ">>> Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show deployment status
Write-Host "Deployment Status:" -ForegroundColor White
Write-Host ""

foreach ($component in $deploymentStatus.Keys) {
    $status = $deploymentStatus[$component]
    $color = switch ($status) {
        "Success" { "Green" }
        "Failed" { "Red" }
        "Warning" { "Yellow" }
        "Skipped" { "Gray" }
        "NotConfigured" { "Yellow" }
        default { "Gray" }
    }
    
    $icon = switch ($status) {
        "Success" { "[OK]" }
        "Failed" { "[X]" }
        "Warning" { "[!]" }
        "Skipped" { "[-]" }
        "NotConfigured" { "[!]" }
        default { "[?]" }
    }
    
    Write-Host "  $icon $component`: $status" -ForegroundColor $color
}

Write-Host ""

# Show test results if available
if ($testResults) {
    Write-Host "Verification Tests:" -ForegroundColor White
    Write-Host ""
    
    foreach ($test in $testResults.Keys) {
        $result = $testResults[$test]
        $color = switch ($result) {
            "Success" { "Green" }
            "Failed" { "Red" }
            "Warning" { "Yellow" }
            default { "Gray" }
        }
        
        $icon = switch ($result) {
            "Success" { "[OK]" }
            "Failed" { "[X]" }
            "Warning" { "[!]" }
            default { "[?]" }
        }
        
        Write-Host "  $icon $test`: $result" -ForegroundColor $color
    }
    
    Write-Host ""
}

# ============================================
# ACCESS INFORMATION
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ">>> Access Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($script:CloudFrontUrl) {
    Write-Host "[WEB APP] Your secure web application:" -ForegroundColor Green
    Write-Host "  $script:CloudFrontUrl" -ForegroundColor Cyan
    Write-Host ""
}

if ($script:ApiUrl) {
    Write-Host "[API] Backend API endpoint:" -ForegroundColor White
    Write-Host "  $script:ApiUrl" -ForegroundColor Gray
    Write-Host ""
}

if ($script:UserPoolId) {
    Write-Host "[AUTH] Cognito User Pool:" -ForegroundColor White
    Write-Host "  Pool ID: $script:UserPoolId" -ForegroundColor Gray
    Write-Host "  Client ID: $script:ClientId" -ForegroundColor Gray
    Write-Host ""
}

# ============================================
# NEXT STEPS
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ">>> Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$hasWarnings = $false

# Check what needs attention
if ($deploymentStatus.Secrets -eq "NotConfigured") {
    Write-Host "[ACTION] Configure API Keys:" -ForegroundColor Yellow
    Write-Host "  1. Get API keys from:" -ForegroundColor White
    Write-Host "     - Groq: https://console.groq.com/keys" -ForegroundColor Gray
    Write-Host "     - Unsplash: https://unsplash.com/developers" -ForegroundColor Gray
    Write-Host "  2. Run: .\scripts\fix-secret.ps1" -ForegroundColor White
    Write-Host ""
    $hasWarnings = $true
}

if ($deploymentStatus.Infrastructure -eq "Success" -and !$SkipWeb) {
    Write-Host "[TEST] Open your web app:" -ForegroundColor Green
    Write-Host "  $script:CloudFrontUrl" -ForegroundColor Cyan
    Write-Host ""
}

if ($script:CloudFrontUrl -notmatch 'darptech.com') {
    Write-Host "[OPTIONAL] Add Custom Domain:" -ForegroundColor White
    Write-Host "  1. Request SSL certificate:" -ForegroundColor Gray
    Write-Host "     .\scripts\request-ssl-certificate.ps1 -DomainName `"app.darptech.com`"" -ForegroundColor Gray
    Write-Host "  2. Add DNS records to Squarespace" -ForegroundColor Gray
    Write-Host "  3. Update Terraform with certificate ARN" -ForegroundColor Gray
    Write-Host "  4. Run: terraform apply" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  See: SQUARESPACE_QUICKSTART.md for details" -ForegroundColor Gray
    Write-Host ""
}

# ============================================
# FINAL STATUS
# ============================================
$allSuccess = ($deploymentStatus.Values | Where-Object { $_ -eq "Failed" }).Count -eq 0

if ($allSuccess) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    if ($hasWarnings) {
        Write-Host "Some configuration still needed (see above)" -ForegroundColor Yellow
    } else {
        Write-Host "Your app is fully deployed and ready!" -ForegroundColor Green
    }
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "[FAILED] Deployment had errors" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above and retry" -ForegroundColor Yellow
}

Write-Host ""

# Return to original location
Set-Location $originalLocation

