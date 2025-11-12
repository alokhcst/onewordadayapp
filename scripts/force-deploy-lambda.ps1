#!/usr/bin/env pwsh
# Force deploy Lambda functions directly via AWS CLI

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[FORCE DEPLOY] Lambda Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$functions = @{
    "get-todays-word" = "backend/src/get-todays-word"
    "get-user-profile" = "backend/src/user-preferences"
    "update-user-profile" = "backend/src/user-preferences"
    "submit-feedback" = "backend/src/feedback"
    "get-history" = "backend/src/word-history"
}

$deployed = 0
$failed = 0

foreach ($func in $functions.Keys) {
    $sourcePath = $functions[$func]
    $functionName = "onewordaday-$func"
    
    Write-Host "[$($deployed + $failed + 1)/$($functions.Count)] Deploying $functionName..." -ForegroundColor Cyan
    
    try {
        # Create zip file
        $zipPath = "lambda-deploy-temp.zip"
        
        Write-Host "  Creating deployment package..." -ForegroundColor Gray
        Compress-Archive -Path "$sourcePath/*" -DestinationPath $zipPath -Force
        
        # Update Lambda function
        Write-Host "  Uploading to Lambda..." -ForegroundColor Gray
        aws lambda update-function-code `
            --function-name $functionName `
            --zip-file fileb://$zipPath `
            --output json | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] $functionName deployed!" -ForegroundColor Green
            $deployed++
        } else {
            Write-Host "  [X] Failed to deploy $functionName" -ForegroundColor Red
            $failed++
        }
        
        # Clean up
        Remove-Item $zipPath -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "  [X] Error deploying $functionName`: $_" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "[SUCCESS] All Lambda Functions Deployed!" -ForegroundColor Green
} else {
    Write-Host "[PARTIAL] Deployment Complete with Errors" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployed: $deployed" -ForegroundColor Green
Write-Host "Failed:   $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "[TIP] Lambda functions are now live!" -ForegroundColor Yellow
    Write-Host "      Test your web app to see the changes" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[!] Some deployments failed" -ForegroundColor Yellow
    Write-Host "    Use terraform apply for full deployment" -ForegroundColor White
    Write-Host ""
}

