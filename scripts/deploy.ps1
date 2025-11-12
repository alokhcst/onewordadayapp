#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Unified deployment script for One Word A Day application
    
.DESCRIPTION
    This script consolidates all deployment and maintenance tasks:
    - Full deployment (infrastructure + backend + frontend)
    - Lambda function updates
    - Web app deployment
    - User cleanup
    - Log checking
    - Health verification
    
.PARAMETER Action
    The deployment action to perform:
    - full: Complete infrastructure and app deployment
    - infra: Infrastructure only (Terraform)
    - lambda: Backend Lambda functions only
    - web: Frontend web app only
    - quick: Quick deploy (Lambda + Web)
    - force-lambda: Force Lambda deploy via AWS CLI (bypass Terraform)
    - cleanup-user: Remove user from Cognito and DynamoDB
    - logs: Check Lambda function logs
    - urls: Show web app URLs
    - status: Show deployment status
    - help: Show this help message
    
.PARAMETER Environment
    Deployment environment (default: production)
    
.PARAMETER Email
    User email (required for cleanup-user action)
    
.PARAMETER Function
    Specific function name (optional, for logs action)
    
.PARAMETER AutoApprove
    Skip confirmations (use with caution)
    
.PARAMETER SkipBuild
    Skip web app build (use existing dist/)
    
.PARAMETER SkipTests
    Skip verification tests
    
.EXAMPLE
    .\scripts\deploy.ps1 -Action full
    Complete deployment with all components
    
.EXAMPLE
    .\scripts\deploy.ps1 -Action quick
    Quick redeploy of Lambda and Web
    
.EXAMPLE
    .\scripts\deploy.ps1 -Action cleanup-user -Email "user@example.com"
    Remove a user completely
    
.EXAMPLE
    .\scripts\deploy.ps1 -Action logs -Function "user-preferences"
    Check logs for specific function
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('full', 'infra', 'lambda', 'web', 'quick', 'force-lambda', 'cleanup-user', 'logs', 'urls', 'status', 'help')]
    [string]$Action = 'help',
    
    [string]$Environment = 'production',
    [string]$Email = '',
    [string]$Function = '',
    [switch]$AutoApprove,
    [switch]$SkipBuild,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$script:OriginalLocation = Get-Location

# ============================================
# HELPER FUNCTIONS
# ============================================

function Write-Header {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host ">>> $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "`n$Message" -ForegroundColor $Color
    Write-Host "$(('=' * $Message.Length))" -ForegroundColor Gray
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  [!] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "  [X] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

function Get-TerraformOutputs {
    try {
        Push-Location terraform
        
        $script:ApiUrl = terraform output -raw api_gateway_url 2>$null
        $script:UserPoolId = terraform output -raw cognito_user_pool_id 2>$null
        $script:ClientId = terraform output -raw cognito_client_id 2>$null
        $script:S3Bucket = terraform output -raw web_app_s3_bucket 2>$null
        $script:CloudFrontUrl = terraform output -raw web_app_cloudfront_url 2>$null
        $script:CloudFrontId = terraform output -raw web_app_cloudfront_id 2>$null
        $script:UsersTable = terraform output -raw users_table_name 2>$null
        $script:DailyWordsTable = terraform output -raw daily_words_table_name 2>$null
        
        Pop-Location
        return $true
    } catch {
        Pop-Location
        return $false
    }
}

function Test-SecretConfiguration {
    try {
        $secretCheck = aws secretsmanager get-secret-value `
            --secret-id "onewordaday/llm-api-keys" `
            --query SecretString `
            --output text 2>$null
        
        if ($secretCheck) {
            $parsed = $secretCheck | ConvertFrom-Json
            $keys = @($parsed.PSObject.Properties.Name)
            Write-Success "Secrets configured: $($keys -join ', ')"
            return $true
        } else {
            Write-Warning "Secrets not configured"
            Write-Info "Run: .\scripts\fix-secret.ps1 to configure API keys"
            return $false
        }
    } catch {
        Write-Warning "Could not check secrets"
        return $false
    }
}

# ============================================
# ACTION: HELP
# ============================================

function Show-Help {
    Write-Header "One Word A Day - Deployment Script"
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor White
    Write-Host "  .\scripts\deploy.ps1 -Action <action> [options]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ACTIONS:" -ForegroundColor White
    Write-Host "  full            " -NoNewline -ForegroundColor Cyan
    Write-Host "Complete deployment (infrastructure + backend + frontend)" -ForegroundColor Gray
    Write-Host "  infra           " -NoNewline -ForegroundColor Cyan
    Write-Host "Deploy infrastructure only (Terraform)" -ForegroundColor Gray
    Write-Host "  lambda          " -NoNewline -ForegroundColor Cyan
    Write-Host "Deploy Lambda functions only" -ForegroundColor Gray
    Write-Host "  web             " -NoNewline -ForegroundColor Cyan
    Write-Host "Deploy web app only" -ForegroundColor Gray
    Write-Host "  quick           " -NoNewline -ForegroundColor Cyan
    Write-Host "Quick deploy (Lambda + Web, no infra changes)" -ForegroundColor Gray
    Write-Host "  force-lambda    " -NoNewline -ForegroundColor Cyan
    Write-Host "Force Lambda deploy via AWS CLI (bypass Terraform)" -ForegroundColor Gray
    Write-Host "  cleanup-user    " -NoNewline -ForegroundColor Cyan
    Write-Host "Remove user from Cognito and DynamoDB" -ForegroundColor Gray
    Write-Host "  logs            " -NoNewline -ForegroundColor Cyan
    Write-Host "Check Lambda function logs" -ForegroundColor Gray
    Write-Host "  urls            " -NoNewline -ForegroundColor Cyan
    Write-Host "Show web app URLs" -ForegroundColor Gray
    Write-Host "  status          " -NoNewline -ForegroundColor Cyan
    Write-Host "Show deployment status" -ForegroundColor Gray
    Write-Host "  help            " -NoNewline -ForegroundColor Cyan
    Write-Host "Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor White
    Write-Host "  -Environment    " -NoNewline -ForegroundColor Yellow
    Write-Host "Deployment environment (default: production)" -ForegroundColor Gray
    Write-Host "  -Email          " -NoNewline -ForegroundColor Yellow
    Write-Host "User email (required for cleanup-user)" -ForegroundColor Gray
    Write-Host "  -Function       " -NoNewline -ForegroundColor Yellow
    Write-Host "Function name (optional, for logs)" -ForegroundColor Gray
    Write-Host "  -AutoApprove    " -NoNewline -ForegroundColor Yellow
    Write-Host "Skip confirmation prompts" -ForegroundColor Gray
    Write-Host "  -SkipBuild      " -NoNewline -ForegroundColor Yellow
    Write-Host "Skip web app build (use existing dist/)" -ForegroundColor Gray
    Write-Host "  -SkipTests      " -NoNewline -ForegroundColor Yellow
    Write-Host "Skip verification tests" -ForegroundColor Gray
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor White
    Write-Host "  # Complete deployment" -ForegroundColor Gray
    Write-Host "  .\scripts\deploy.ps1 -Action full" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Quick redeploy (after code changes)" -ForegroundColor Gray
    Write-Host "  .\scripts\deploy.ps1 -Action quick" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Deploy web app only" -ForegroundColor Gray
    Write-Host "  .\scripts\deploy.ps1 -Action web" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Check logs for specific function" -ForegroundColor Gray
    Write-Host "  .\scripts\deploy.ps1 -Action logs -Function user-preferences" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Remove a test user" -ForegroundColor Gray
    Write-Host "  .\scripts\deploy.ps1 -Action cleanup-user -Email test@example.com" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================
# ACTION: FULL DEPLOYMENT
# ============================================

function Deploy-Full {
    Write-Header "Complete Deployment"
    Write-Host "Environment: $Environment" -ForegroundColor Yellow
    Write-Host ""
    
    $status = @{
        Infrastructure = "Pending"
        Backend = "Pending"
        Secrets = "Pending"
        WebApp = "Pending"
    }
    
    # Step 1: Infrastructure
    Write-Step "[1/4] Deploying Infrastructure (Terraform)"
    
    try {
        Push-Location terraform
        
        if (!(Test-Path "terraform.tfvars")) {
            Write-Warning "terraform.tfvars not found!"
            if (Test-Path "terraform.tfvars.example") {
                Copy-Item "terraform.tfvars.example" "terraform.tfvars"
                Write-Info "Copied terraform.tfvars.example to terraform.tfvars"
                Write-Info "Please edit terraform.tfvars with your values and run again"
                Pop-Location
                return $false
            } else {
                throw "terraform.tfvars.example not found"
            }
        }
        
        Write-Info "Initializing Terraform..."
        terraform init
        if ($LASTEXITCODE -ne 0) { throw "Terraform init failed" }
        
        Write-Info "Validating configuration..."
        terraform validate
        if ($LASTEXITCODE -ne 0) { throw "Terraform validation failed" }
        
        Write-Info "Planning changes..."
        terraform plan -out=tfplan
        if ($LASTEXITCODE -ne 0) { throw "Terraform plan failed" }
        
        if ($AutoApprove) {
            Write-Info "Applying changes (auto-approved)..."
            terraform apply -auto-approve tfplan
        } else {
            Write-Host ""
            $confirm = Read-Host "Apply these changes? (yes/no)"
            if ($confirm -ne 'yes') {
                Write-Warning "Infrastructure deployment cancelled"
                Remove-Item tfplan -ErrorAction SilentlyContinue
                Pop-Location
                return $false
            }
            terraform apply tfplan
        }
        
        if ($LASTEXITCODE -ne 0) { throw "Terraform apply failed" }
        
        Remove-Item tfplan -ErrorAction SilentlyContinue
        Write-Success "Infrastructure deployed!"
        $status.Infrastructure = "Success"
        
        Pop-Location
    } catch {
        Write-Error "Infrastructure deployment failed: $_"
        $status.Infrastructure = "Failed"
        Pop-Location
        return $false
    }
    
    # Get outputs
    Get-TerraformOutputs | Out-Null
    
    # Step 2: Check Secrets
    Write-Step "[2/4] Checking API Secrets"
    $secretsOk = Test-SecretConfiguration
    $status.Secrets = if ($secretsOk) { "Success" } else { "Warning" }
    
    # Step 3: Deploy Web App
    Write-Step "[3/4] Building and Deploying Web App"
    
    if (Deploy-WebApp) {
        $status.WebApp = "Success"
    } else {
        $status.WebApp = "Failed"
    }
    
    # Step 4: Verification
    if (!$SkipTests) {
        Write-Step "[4/4] Running Verification Tests"
        Test-Deployment
    }
    
    # Summary
    Show-DeploymentSummary $status
    return $true
}

# ============================================
# ACTION: INFRASTRUCTURE ONLY
# ============================================

function Deploy-Infrastructure {
    Write-Header "Infrastructure Deployment (Terraform)"
    
    try {
        Push-Location terraform
        
        Write-Info "Initializing Terraform..."
        terraform init
        if ($LASTEXITCODE -ne 0) { throw "Init failed" }
        
        Write-Info "Planning changes..."
        terraform plan -out=tfplan
        if ($LASTEXITCODE -ne 0) { throw "Plan failed" }
        
        if ($AutoApprove) {
            terraform apply -auto-approve tfplan
        } else {
            Write-Host ""
            $confirm = Read-Host "Apply these changes? (yes/no)"
            if ($confirm -ne 'yes') {
                Remove-Item tfplan -ErrorAction SilentlyContinue
                Pop-Location
                Write-Warning "Cancelled"
                return $false
            }
            terraform apply tfplan
        }
        
        if ($LASTEXITCODE -ne 0) { throw "Apply failed" }
        
        Remove-Item tfplan -ErrorAction SilentlyContinue
        Write-Success "Infrastructure deployed!"
        
        Pop-Location
        return $true
    } catch {
        Write-Error "Failed: $_"
        Pop-Location
        return $false
    }
}

# ============================================
# ACTION: LAMBDA DEPLOYMENT
# ============================================

function Deploy-Lambda {
    Write-Header "Lambda Function Deployment"
    
    try {
        Push-Location terraform
        
        Write-Info "Deploying Lambda functions via Terraform..."
        terraform apply -target="module.lambda" -auto-approve
        
        if ($LASTEXITCODE -ne 0) { throw "Lambda deployment failed" }
        
        Write-Success "Lambda functions deployed!"
        
        # Verify functions
        Write-Host ""
        Write-Info "Verifying functions..."
        
        $functions = @(
            "onewordaday-$Environment-get-todays-word",
            "onewordaday-$Environment-user-preferences",
            "onewordaday-$Environment-feedback-processor",
            "onewordaday-$Environment-word-history"
        )
        
        foreach ($func in $functions) {
            try {
                $modified = aws lambda get-function --function-name $func --query 'Configuration.LastModified' --output text 2>$null
                if ($modified) {
                    Write-Success "$func"
                }
            } catch {
                Write-Warning "$func (could not verify)"
            }
        }
        
        Pop-Location
        Write-Host ""
        Write-Success "Lambda deployment complete!"
        return $true
    } catch {
        Write-Error "Failed: $_"
        Pop-Location
        return $false
    }
}

# ============================================
# ACTION: WEB APP DEPLOYMENT
# ============================================

function Deploy-WebApp {
    if (!$script:S3Bucket) {
        Get-TerraformOutputs | Out-Null
    }
    
    if (!$script:S3Bucket) {
        Write-Warning "S3 bucket not found. Run infrastructure deployment first."
        return $false
    }
    
    try {
        # Build
        if (!$SkipBuild) {
            Write-Info "Building web app..."
            npx expo export --platform web
            if ($LASTEXITCODE -ne 0) { throw "Build failed" }
            Write-Success "Build complete"
        }
        
        # Verify dist exists
        if (!(Test-Path "dist")) {
            throw "dist/ folder not found"
        }
        
        # Upload to S3
        Write-Info "Uploading to S3..."
        
        # Static assets with long cache
        aws s3 sync dist/ s3://$script:S3Bucket/ `
            --delete `
            --cache-control "public, max-age=31536000, immutable" `
            --exclude "*.html" `
            --exclude "*.json" | Out-Null
        
        # HTML/JSON with no cache
        aws s3 sync dist/ s3://$script:S3Bucket/ `
            --cache-control "public, max-age=0, must-revalidate" `
            --exclude "*" `
            --include "*.html" `
            --include "*.json" | Out-Null
        
        if ($LASTEXITCODE -ne 0) { throw "Upload failed" }
        Write-Success "Upload complete"
        
        # Invalidate CloudFront
        if ($script:CloudFrontId) {
            Write-Info "Invalidating CloudFront cache..."
            
            $invalidation = aws cloudfront create-invalidation `
                --distribution-id $script:CloudFrontId `
                --paths "/*" `
                --output json 2>$null | ConvertFrom-Json
            
            if ($invalidation) {
                Write-Success "Cache invalidation started"
            }
        }
        
        Write-Host ""
        Write-Success "Web app deployed!"
        Write-Host ""
        Write-Host "  URL: $script:CloudFrontUrl" -ForegroundColor Cyan
        Write-Host ""
        
        return $true
    } catch {
        Write-Error "Web deployment failed: $_"
        return $false
    }
}

# ============================================
# ACTION: QUICK DEPLOY
# ============================================

function Deploy-Quick {
    Write-Header "Quick Deploy (Lambda + Web)"
    
    # Deploy Lambda
    Write-Step "[1/2] Deploying Lambda Functions"
    if (!(Deploy-Lambda)) {
        Write-Error "Lambda deployment failed"
        return $false
    }
    
    # Deploy Web
    Write-Step "[2/2] Deploying Web App"
    if (!(Deploy-WebApp)) {
        Write-Error "Web deployment failed"
        return $false
    }
    
    Write-Host ""
    Write-Header "Quick Deploy Complete!"
    Write-Host ""
    Write-Host "[ACTION] Clear browser cache and refresh:" -ForegroundColor Yellow
    Write-Host "  Ctrl + Shift + R (Chrome/Firefox)" -ForegroundColor White
    Write-Host "  Cmd + Shift + R (Safari)" -ForegroundColor White
    Write-Host ""
    
    if ($script:CloudFrontUrl) {
        Write-Host "[TEST] Open your web app:" -ForegroundColor Green
        Write-Host "  $script:CloudFrontUrl" -ForegroundColor Cyan
        Write-Host ""
    }
    
    return $true
}

# ============================================
# ACTION: FORCE LAMBDA DEPLOY
# ============================================

function Deploy-ForceLambda {
    Write-Header "Force Lambda Deployment (AWS CLI)"
    Write-Warning "Bypassing Terraform - use only for quick testing!"
    Write-Host ""
    
    $functions = @{
        "get-todays-word" = "backend/src/get-todays-word"
        "user-preferences" = "backend/src/user-preferences"
        "feedback-processor" = "backend/src/feedback-processor"
        "word-history" = "backend/src/word-history"
    }
    
    $deployed = 0
    $failed = 0
    
    foreach ($func in $functions.Keys) {
        $sourcePath = $functions[$func]
        $functionName = "onewordaday-$Environment-$func"
        
        Write-Host "[$($deployed + $failed + 1)/$($functions.Count)] Deploying $functionName..." -ForegroundColor Cyan
        
        try {
            if (!(Test-Path $sourcePath)) {
                throw "Source path not found: $sourcePath"
            }
            
            $zipPath = "lambda-deploy-temp.zip"
            
            Write-Info "Creating deployment package..."
            Compress-Archive -Path "$sourcePath/*" -DestinationPath $zipPath -Force
            
            Write-Info "Uploading to Lambda..."
            aws lambda update-function-code `
                --function-name $functionName `
                --zip-file fileb://$zipPath `
                --output json | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$functionName deployed!"
                $deployed++
            } else {
                Write-Error "Failed to deploy $functionName"
                $failed++
            }
            
            Remove-Item $zipPath -ErrorAction SilentlyContinue
            
        } catch {
            Write-Error "Error deploying $functionName`: $_"
            $failed++
        }
        
        Write-Host ""
    }
    
    # Summary
    Write-Header "Force Deploy Summary"
    Write-Host "Deployed: $deployed" -ForegroundColor Green
    Write-Host "Failed:   $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
    Write-Host ""
    
    if ($failed -eq 0) {
        Write-Success "All Lambda functions deployed!"
        return $true
    } else {
        Write-Warning "Some deployments failed. Use terraform apply for full deployment."
        return $false
    }
}

# ============================================
# ACTION: CLEANUP USER
# ============================================

function Cleanup-User {
    if (!$Email) {
        Write-Error "Email parameter required for cleanup-user action"
        Write-Host "Usage: .\scripts\deploy.ps1 -Action cleanup-user -Email user@example.com" -ForegroundColor Gray
        return $false
    }
    
    Write-Header "User Cleanup"
    Write-Host "Email: $Email" -ForegroundColor Yellow
    Write-Host ""
    
    # Get User Pool ID
    Write-Step "[1/3] Getting User Pool ID"
    
    Get-TerraformOutputs | Out-Null
    
    if (!$script:UserPoolId) {
        Write-Error "Could not get User Pool ID from Terraform"
        return $false
    }
    
    Write-Info "User Pool ID: $script:UserPoolId"
    
    # Delete from Cognito
    Write-Step "[2/3] Deleting from Cognito"
    
    $userId = $null
    
    try {
        $cognitoUser = aws cognito-idp admin-get-user `
            --user-pool-id $script:UserPoolId `
            --username $Email `
            --output json 2>$null | ConvertFrom-Json
        
        if ($cognitoUser) {
            $userId = $cognitoUser.UserAttributes | Where-Object { $_.Name -eq 'sub' } | Select-Object -ExpandProperty Value
            
            Write-Info "Found user in Cognito"
            Write-Info "User ID: $userId"
            Write-Info "Status: $($cognitoUser.UserStatus)"
            
            aws cognito-idp admin-delete-user `
                --user-pool-id $script:UserPoolId `
                --username $Email
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "User deleted from Cognito"
            } else {
                Write-Warning "Could not delete user from Cognito"
            }
        } else {
            Write-Warning "User not found in Cognito"
        }
    } catch {
        Write-Warning "User not found in Cognito: $_"
    }
    
    # Delete from DynamoDB
    if ($userId) {
        Write-Step "[3/3] Cleaning up DynamoDB"
        
        if ($script:UsersTable) {
            Write-Info "Deleting from Users table..."
            
            try {
                aws dynamodb delete-item `
                    --table-name $script:UsersTable `
                    --key "{\"userId\":{\"S\":\"$userId\"}}" 2>&1 | Out-Null
                
                Write-Success "User profile deleted"
            } catch {
                Write-Warning "Could not delete user profile"
            }
        }
        
        if ($script:DailyWordsTable) {
            Write-Info "Deleting from DailyWords table..."
            
            try {
                $words = aws dynamodb query `
                    --table-name $script:DailyWordsTable `
                    --key-condition-expression "userId = :uid" `
                    --expression-attribute-values "{\":uid\":{\"S\":\"$userId\"}}" `
                    --output json | ConvertFrom-Json
                
                if ($words.Items.Count -gt 0) {
                    Write-Info "Found $($words.Items.Count) words to delete"
                    
                    foreach ($word in $words.Items) {
                        $date = $word.date.S
                        aws dynamodb delete-item `
                            --table-name $script:DailyWordsTable `
                            --key "{\"userId\":{\"S\":\"$userId\"},\"date\":{\"S\":\"$date\"}}" 2>&1 | Out-Null
                    }
                    
                    Write-Success "Daily words deleted"
                } else {
                    Write-Info "No daily words found"
                }
            } catch {
                Write-Warning "Could not delete daily words"
            }
        }
    } else {
        Write-Step "[3/3] Skipping DynamoDB cleanup (no user ID)"
    }
    
    # Summary
    Write-Host ""
    Write-Header "User Cleanup Complete!"
    Write-Host ""
    Write-Host "Email: $Email" -ForegroundColor White
    if ($userId) {
        Write-Host "User ID: $userId" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "[TIP] User can now sign up again with this email" -ForegroundColor Yellow
    Write-Host ""
    
    return $true
}

# ============================================
# ACTION: CHECK LOGS
# ============================================

function Check-Logs {
    Write-Header "Lambda Function Logs"
    
    $functions = @(
        "onewordaday-$Environment-get-todays-word",
        "onewordaday-$Environment-user-preferences",
        "onewordaday-$Environment-feedback-processor",
        "onewordaday-$Environment-word-history",
        "onewordaday-$Environment-word-generation",
        "onewordaday-$Environment-content-enrichment",
        "onewordaday-$Environment-notification-dispatcher"
    )
    
    if ($Function) {
        $functions = @("onewordaday-$Environment-$Function")
    }
    
    foreach ($func in $functions) {
        Write-Host "`n" -NoNewline
        Write-Step "Logs for: $func"
        
        $logGroup = "/aws/lambda/$func"
        
        # Check if log group exists
        $logGroupExists = aws logs describe-log-groups `
            --log-group-name-prefix $logGroup `
            --query "logGroups[?logGroupName=='$logGroup']" `
            --output json | ConvertFrom-Json
        
        if ($logGroupExists.Count -eq 0) {
            Write-Error "Log group not found: $logGroup"
            Write-Warning "Function hasn't been invoked yet or doesn't exist"
            continue
        }
        
        # Get recent logs
        Write-Info "Last 50 log entries (last hour):"
        Write-Host ""
        
        try {
            aws logs tail $logGroup --since 1h --format short | Select-Object -Last 50
        } catch {
            Write-Error "Could not retrieve logs: $_"
        }
        
        Write-Host ""
    }
    
    Write-Host ""
    Write-Host "[TIP] Look for:" -ForegroundColor Yellow
    Write-Host "  - Error messages or stack traces" -ForegroundColor White
    Write-Host "  - Task timed out messages" -ForegroundColor White
    Write-Host "  - Cannot find module errors" -ForegroundColor White
    Write-Host "  - DynamoDB access errors" -ForegroundColor White
    Write-Host ""
    
    return $true
}

# ============================================
# ACTION: SHOW URLS
# ============================================

function Show-Urls {
    Write-Header "Web App URLs"
    
    Get-TerraformOutputs | Out-Null
    
    if ($script:CloudFrontUrl) {
        Write-Host "[SECURE] CloudFront URL (HTTPS):" -ForegroundColor Green
        Write-Host "  $script:CloudFrontUrl" -ForegroundColor Cyan
        Write-Host ""
    }
    
    if ($script:S3Bucket) {
        $s3Url = "http://$script:S3Bucket.s3-website-us-east-1.amazonaws.com"
        Write-Host "[BASIC] S3 Website URL (HTTP only):" -ForegroundColor Yellow
        Write-Host "  $s3Url" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($script:CloudFrontId) {
        Write-Host "[INFO] CloudFront Distribution ID:" -ForegroundColor White
        Write-Host "  $script:CloudFrontId" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($script:S3Bucket) {
        Write-Host "[INFO] S3 Bucket:" -ForegroundColor White
        Write-Host "  $script:S3Bucket" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($script:ApiUrl) {
        Write-Host "[API] Backend Endpoint:" -ForegroundColor White
        Write-Host "  $script:ApiUrl" -ForegroundColor Gray
        Write-Host ""
    }
    
    if (!$script:CloudFrontUrl -and !$script:S3Bucket) {
        Write-Warning "No web hosting outputs found"
        Write-Info "Run infrastructure deployment first"
        Write-Host ""
        return $false
    }
    
    Write-Host "[TIP] Use the CloudFront URL for secure HTTPS access!" -ForegroundColor Yellow
    Write-Host ""
    
    return $true
}

# ============================================
# ACTION: SHOW STATUS
# ============================================

function Show-Status {
    Write-Header "Deployment Status"
    
    Write-Step "Infrastructure Status"
    
    Get-TerraformOutputs | Out-Null
    
    if ($script:ApiUrl) {
        Write-Success "API Gateway: $script:ApiUrl"
    } else {
        Write-Warning "API Gateway: Not deployed"
    }
    
    if ($script:UserPoolId) {
        Write-Success "Cognito User Pool: $script:UserPoolId"
    } else {
        Write-Warning "Cognito User Pool: Not deployed"
    }
    
    if ($script:S3Bucket) {
        Write-Success "S3 Bucket: $script:S3Bucket"
    } else {
        Write-Warning "S3 Bucket: Not deployed"
    }
    
    if ($script:CloudFrontUrl) {
        Write-Success "CloudFront: $script:CloudFrontUrl"
    } else {
        Write-Warning "CloudFront: Not deployed"
    }
    
    Write-Step "Backend Status"
    
    $functions = @(
        "onewordaday-$Environment-get-todays-word",
        "onewordaday-$Environment-user-preferences",
        "onewordaday-$Environment-feedback-processor",
        "onewordaday-$Environment-word-history"
    )
    
    foreach ($func in $functions) {
        try {
            $modified = aws lambda get-function --function-name $func --query 'Configuration.LastModified' --output text 2>$null
            if ($modified) {
                Write-Success "$func (Last modified: $modified)"
            }
        } catch {
            Write-Warning "$func (Not deployed or not accessible)"
        }
    }
    
    Write-Step "Secrets Status"
    Test-SecretConfiguration | Out-Null
    
    Write-Host ""
    return $true
}

# ============================================
# HELPER: TEST DEPLOYMENT
# ============================================

function Test-Deployment {
    $testResults = @{
        ApiEndpoint = "Pending"
        WebApp = "Pending"
        Authentication = "Pending"
    }
    
    # Test API Gateway
    if ($script:ApiUrl) {
        Write-Info "Testing API Gateway endpoint..."
        
        try {
            $response = Invoke-WebRequest -Uri "$script:ApiUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                Write-Success "API Gateway is responding"
                $testResults.ApiEndpoint = "Success"
            }
        } catch {
            Write-Warning "API Gateway test failed (may need authentication)"
            $testResults.ApiEndpoint = "Warning"
        }
    }
    
    # Test Web App
    if ($script:CloudFrontUrl) {
        Write-Info "Testing web app (CloudFront)..."
        
        try {
            $response = Invoke-WebRequest -Uri $script:CloudFrontUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                Write-Success "Web app is accessible"
                $testResults.WebApp = "Success"
            }
        } catch {
            Write-Warning "Web app test failed: $($_.Exception.Message)"
            $testResults.WebApp = "Failed"
        }
    }
    
    # Test Cognito
    if ($script:UserPoolId) {
        Write-Info "Checking Cognito User Pool..."
        
        try {
            $userPool = aws cognito-idp describe-user-pool `
                --user-pool-id $script:UserPoolId `
                --output json 2>$null | ConvertFrom-Json
            
            if ($userPool) {
                Write-Success "Cognito User Pool configured"
                $testResults.Authentication = "Success"
            }
        } catch {
            Write-Warning "Could not verify Cognito configuration"
            $testResults.Authentication = "Warning"
        }
    }
    
    return $testResults
}

# ============================================
# HELPER: SHOW SUMMARY
# ============================================

function Show-DeploymentSummary {
    param($status)
    
    Write-Header "Deployment Summary"
    Write-Host ""
    
    Write-Host "Deployment Status:" -ForegroundColor White
    Write-Host ""
    
    foreach ($component in $status.Keys) {
        $result = $status[$component]
        $color = switch ($result) {
            "Success" { "Green" }
            "Failed" { "Red" }
            "Warning" { "Yellow" }
            "Skipped" { "Gray" }
            default { "Gray" }
        }
        
        $icon = switch ($result) {
            "Success" { "[OK]" }
            "Failed" { "[X]" }
            "Warning" { "[!]" }
            "Skipped" { "[-]" }
            default { "[?]" }
        }
        
        Write-Host "  $icon $component`: $result" -ForegroundColor $color
    }
    
    Write-Host ""
    
    if ($script:CloudFrontUrl) {
        Write-Header "Access Information"
        Write-Host ""
        Write-Host "[WEB APP] Your secure web application:" -ForegroundColor Green
        Write-Host "  $script:CloudFrontUrl" -ForegroundColor Cyan
        Write-Host ""
    }
    
    $allSuccess = ($status.Values | Where-Object { $_ -eq "Failed" }).Count -eq 0
    
    if ($allSuccess) {
        Write-Header "[SUCCESS] Deployment Complete!"
        Write-Host ""
        Write-Host "Your app is fully deployed and ready!" -ForegroundColor Green
    } else {
        Write-Header "[FAILED] Deployment had errors"
        Write-Host ""
        Write-Host "Check the error messages above and retry" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# ============================================
# MAIN EXECUTION
# ============================================

try {
    switch ($Action) {
        'full' {
            Deploy-Full
        }
        'infra' {
            Deploy-Infrastructure
        }
        'lambda' {
            Deploy-Lambda
        }
        'web' {
            Write-Header "Web App Deployment"
            Deploy-WebApp
        }
        'quick' {
            Deploy-Quick
        }
        'force-lambda' {
            Deploy-ForceLambda
        }
        'cleanup-user' {
            Cleanup-User
        }
        'logs' {
            Check-Logs
        }
        'urls' {
            Show-Urls
        }
        'status' {
            Show-Status
        }
        'help' {
            Show-Help
        }
        default {
            Show-Help
        }
    }
} catch {
    Write-Host ""
    Write-Error "Unexpected error: $_"
    Write-Host ""
    exit 1
} finally {
    Set-Location $script:OriginalLocation
}

