#!/usr/bin/env pwsh
# Rebuild Lambda layer with correct uuid version

Write-Host "Rebuilding Lambda Layer..." -ForegroundColor Cyan
Write-Host "Fixing uuid ESM incompatibility issue`n" -ForegroundColor Yellow

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

# Initialize package.json
Write-Host "Initializing package.json..." -ForegroundColor Gray
npm init -y | Out-Null

# Install dependencies with uuid v8.x (CommonJS compatible)
Write-Host "Installing dependencies (using uuid v8.x for CommonJS compatibility)..." -ForegroundColor Gray
npm install @aws-sdk/client-dynamodb@^3.540.0 `
    @aws-sdk/lib-dynamodb@^3.540.0 `
    @aws-sdk/client-s3@^3.540.0 `
    @aws-sdk/client-sns@^3.540.0 `
    @aws-sdk/client-ses@^3.540.0 `
    @aws-sdk/client-bedrock-runtime@^3.540.0 `
    @aws-sdk/client-secrets-manager@^3.540.0 `
    @aws-sdk/client-lambda@^3.540.0 `
    axios@^1.6.7 `
    uuid@8.3.2

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

Write-Host "`nLambda layer rebuilt successfully!" -ForegroundColor Green
Write-Host "Next step: Deploy with Terraform" -ForegroundColor Yellow
Write-Host "  cd ..\terraform" -ForegroundColor White
Write-Host "  terraform apply" -ForegroundColor White

