#!/usr/bin/env pwsh
# Clean up user from Cognito and DynamoDB

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[CLEANUP] User Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor Yellow
Write-Host ""

# Get User Pool ID from Terraform
Write-Host "[1/3] Getting User Pool ID..." -ForegroundColor Cyan

Push-Location terraform

try {
    $userPoolId = terraform output -raw cognito_user_pool_id
    Write-Host "  User Pool ID: $userPoolId" -ForegroundColor Gray
} catch {
    Write-Host "  [X] Could not get User Pool ID from Terraform" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Step 1: Delete from Cognito
Write-Host ""
Write-Host "[2/3] Deleting user from Cognito..." -ForegroundColor Cyan

try {
    # Try to get user first
    $cognitoUser = aws cognito-idp admin-get-user `
        --user-pool-id $userPoolId `
        --username $Email `
        --output json 2>$null | ConvertFrom-Json
    
    if ($cognitoUser) {
        $userId = $cognitoUser.UserAttributes | Where-Object { $_.Name -eq 'sub' } | Select-Object -ExpandProperty Value
        
        Write-Host "  Found user in Cognito" -ForegroundColor Gray
        Write-Host "  User ID: $userId" -ForegroundColor Gray
        Write-Host "  Status: $($cognitoUser.UserStatus)" -ForegroundColor Gray
        
        # Delete user
        aws cognito-idp admin-delete-user `
            --user-pool-id $userPoolId `
            --username $Email
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] User deleted from Cognito" -ForegroundColor Green
        } else {
            Write-Host "  [!] Could not delete user from Cognito" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [!] User not found in Cognito (already deleted)" -ForegroundColor Yellow
        
        # Try to find by sub (UUID)
        Write-Host "  Searching by UUID pattern..." -ForegroundColor Gray
        
        if ($Email -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
            Write-Host "  Email looks like a UUID, trying as username..." -ForegroundColor Gray
            
            aws cognito-idp admin-delete-user `
                --user-pool-id $userPoolId `
                --username $Email 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] User deleted from Cognito" -ForegroundColor Green
                $userId = $Email
            }
        }
    }
} catch {
    Write-Host "  [!] User not found in Cognito: $_" -ForegroundColor Yellow
}

# Step 2: Delete from DynamoDB
if ($userId) {
    Write-Host ""
    Write-Host "[3/3] Cleaning up DynamoDB data..." -ForegroundColor Cyan
    
    Push-Location terraform
    $usersTable = terraform output -raw users_table_name 2>$null
    $dailyWordsTable = terraform output -raw daily_words_table_name 2>$null
    Pop-Location
    
    if ($usersTable) {
        Write-Host "  Deleting from Users table..." -ForegroundColor Gray
        
        try {
            aws dynamodb delete-item `
                --table-name $usersTable `
                --key "{\"userId\":{\"S\":\"$userId\"}}" 2>&1 | Out-Null
            
            Write-Host "  [OK] User profile deleted" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Could not delete user profile" -ForegroundColor Yellow
        }
    }
    
    if ($dailyWordsTable) {
        Write-Host "  Deleting from DailyWords table..." -ForegroundColor Gray
        
        try {
            # Query all words for user
            $words = aws dynamodb query `
                --table-name $dailyWordsTable `
                --key-condition-expression "userId = :uid" `
                --expression-attribute-values "{\":uid\":{\"S\":\"$userId\"}}" `
                --output json | ConvertFrom-Json
            
            if ($words.Items.Count -gt 0) {
                Write-Host "  Found $($words.Items.Count) words to delete" -ForegroundColor Gray
                
                foreach ($word in $words.Items) {
                    $date = $word.date.S
                    aws dynamodb delete-item `
                        --table-name $dailyWordsTable `
                        --key "{\"userId\":{\"S\":\"$userId\"},\"date\":{\"S\":\"$date\"}}" 2>&1 | Out-Null
                }
                
                Write-Host "  [OK] Daily words deleted" -ForegroundColor Green
            } else {
                Write-Host "  [!] No daily words found" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [!] Could not delete daily words" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host ""
    Write-Host "[3/3] Skipping DynamoDB cleanup (no user ID found)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "[SUCCESS] User Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Email: $Email" -ForegroundColor White
if ($userId) {
    Write-Host "User ID: $userId" -ForegroundColor White
}
Write-Host ""
Write-Host "[TIP] User can now sign up again with this email" -ForegroundColor Yellow
Write-Host ""

