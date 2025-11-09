#!/usr/bin/env pwsh
# Rebuild Lambda layer for ESM (ECMAScript Modules)

Write-Host "Rebuilding Lambda Layer for ESM..." -ForegroundColor Cyan
Write-Host "Using latest UUID package with ESM support`n" -ForegroundColor Yellow

Set-Location -Path "..\backend"

# Remove old layer
if (Test-Path "layers") {
    Write-Host "Removing old layer..." -ForegroundColor Gray
    Remove-Item -Recurse -Force layers
}

# Create layer directory
Write-Host "Creating layer structure..." -ForegroundColor Gray
New-Item -ItemType Directory -Path "layers\nodejs" -Force | Out-Null

Set-Location -Path "layers\nodejs"

# Initialize package.json with ESM support
Write-Host "Initializing package.json with ESM support..." -ForegroundColor Gray
@"
{
  "type": "module",
  "name": "onewordaday-layer",
  "version": "1.0.0",
  "description": "Shared dependencies for One Word A Day Lambda functions - ESM"
}
"@ | Out-File -FilePath "package.json" -Encoding utf8

# Install dependencies with latest versions (ESM compatible)
Write-Host "Installing dependencies (latest versions with ESM support)..." -ForegroundColor Gray
npm install @aws-sdk/client-dynamodb@^3.540.0 `
    @aws-sdk/lib-dynamodb@^3.540.0 `
    @aws-sdk/client-s3@^3.540.0 `
    @aws-sdk/client-sns@^3.540.0 `
    @aws-sdk/client-ses@^3.540.0 `
    @aws-sdk/client-bedrock-runtime@^3.540.0 `
    @aws-sdk/client-secrets-manager@^3.540.0 `
    @aws-sdk/client-lambda@^3.540.0 `
    axios@^1.6.7 `
    uuid@^10.0.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed successfully!" -ForegroundColor Green

# Create zip
Set-Location -Path ".."
Write-Host "Creating dependencies.zip..." -ForegroundColor Gray

# Remove old zip if exists
if (Test-Path "dependencies.zip") {
    Remove-Item "dependencies.zip"
}

# Create zip (PowerShell way)
Compress-Archive -Path "nodejs" -DestinationPath "dependencies.zip" -Force

$zipSize = [math]::Round((Get-Item "dependencies.zip").Length / 1MB, 2)
Write-Host "Layer created: dependencies.zip ($zipSize MB)" -ForegroundColor Green

Set-Location -Path "..\.."
Set-Location -Path "scripts"

Write-Host "`nLambda layer rebuilt with ESM support!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd ..\backend && npm install" -ForegroundColor White
Write-Host "  2. npm run build" -ForegroundColor White
Write-Host "  3. cd ..\terraform && terraform apply" -ForegroundColor White


