#!/usr/bin/env pwsh
# Emergency fix and deploy - handles state locks and deploys Lambda

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[EMERGENCY FIX] Deploy Lambda Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any stuck Terraform processes
Write-Host "[1/3] Cleaning up stuck processes..." -ForegroundColor Cyan

try {
    $terraformProcesses = Get-Process terraform -ErrorAction SilentlyContinue
    if ($terraformProcesses) {
        Write-Host "  Found $($terraformProcesses.Count) Terraform process(es), killing..." -ForegroundColor Yellow
        Stop-Process -Name terraform -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "  [OK] Processes terminated" -ForegroundColor Green
    } else {
        Write-Host "  No stuck processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [!] Could not check processes: $_" -ForegroundColor Yellow
}

# Step 2: Remove state lock
Write-Host ""
Write-Host "[2/3] Removing state lock..." -ForegroundColor Cyan

Push-Location terraform

try {
    if (Test-Path ".terraform.tfstate.lock.info") {
        Remove-Item ".terraform.tfstate.lock.info" -Force
        Write-Host "  [OK] Lock file removed" -ForegroundColor Green
    } else {
        Write-Host "  No lock file found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [!] Could not remove lock: $_" -ForegroundColor Yellow
}

Pop-Location

# Step 3: Force deploy Lambda via AWS CLI (no Terraform)
Write-Host ""
Write-Host "[3/3] Force deploying Lambda functions..." -ForegroundColor Cyan
Write-Host ""

$functions = @{
    "onewordaday-get-todays-word" = "backend/src/get-todays-word"
    "onewordaday-get-user-profile" = "backend/src/user-preferences"
    "onewordaday-update-user-profile" = "backend/src/user-preferences"
    "onewordaday-submit-feedback" = "backend/src/feedback"
    "onewordaday-get-history" = "backend/src/word-history"
}

$deployed = 0
$failed = 0
$zipPath = "lambda-temp-deploy.zip"

foreach ($funcName in $functions.Keys) {
    $sourcePath = $functions[$funcName]
    
    Write-Host "  Deploying $funcName..." -ForegroundColor Gray
    
    try {
        # Check if function exists
        $exists = aws lambda get-function --function-name $funcName 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    [!] Function not found, skipping" -ForegroundColor Yellow
            continue
        }
        
        # Create zip
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        
        Compress-Archive -Path "$sourcePath\*" -DestinationPath $zipPath -Force
        
        # Update function
        aws lambda update-function-code `
            --function-name $funcName `
            --zip-file fileb://$zipPath 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] $funcName" -ForegroundColor Green
            $deployed++
        } else {
            Write-Host "    [X] Failed" -ForegroundColor Red
            $failed++
        }
        
        # Clean up
        Remove-Item $zipPath -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "    [X] Error: $_" -ForegroundColor Red
        $failed++
    }
}

# Clean up zip
Remove-Item $zipPath -ErrorAction SilentlyContinue

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($failed -eq 0 -and $deployed -gt 0) {
    Write-Host "[SUCCESS] Lambda Functions Updated!" -ForegroundColor Green
} elseif ($deployed -gt 0) {
    Write-Host "[PARTIAL] Some Functions Updated" -ForegroundColor Yellow
} else {
    Write-Host "[FAILED] Could Not Deploy" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployed: $deployed" -ForegroundColor Green
Write-Host "Failed:   $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($deployed -gt 0) {
    Write-Host "[ACTION] Test your web app now:" -ForegroundColor Yellow
    Write-Host "  1. Clear browser cache (Ctrl + Shift + R)" -ForegroundColor White
    Write-Host "  2. Sign up with new email" -ForegroundColor White
    Write-Host "  3. Verify email code" -ForegroundColor White
    Write-Host "  4. Complete onboarding" -ForegroundColor White
    Write-Host "  5. Check profile page" -ForegroundColor White
    Write-Host ""
    Write-Host "[TIP] If issues persist, check CloudWatch logs:" -ForegroundColor Yellow
    Write-Host "  aws logs tail /aws/lambda/onewordaday-update-user-profile --follow" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[!] Deployment failed. Try terraform apply instead:" -ForegroundColor Yellow
    Write-Host "  cd terraform" -ForegroundColor Gray
    Write-Host "  terraform apply -target='module.lambda'" -ForegroundColor Gray
    Write-Host ""
}




