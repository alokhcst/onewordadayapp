#!/usr/bin/env pwsh
# Fix for "Body is unusable: Body has already been read" Expo error

Write-Host "Fixing Expo 'Body is unusable' error..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear Expo cache
Write-Host "[1/4] Clearing Expo cache..." -ForegroundColor Yellow
npx expo start --clear
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Cache cleared successfully" -ForegroundColor Green
} else {
    Write-Host "  Note: Cache clear may have failed, continuing..." -ForegroundColor Yellow
}

# Step 2: Clear npm cache
Write-Host "`n[2/4] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  npm cache cleared" -ForegroundColor Green

# Step 3: Clear watchman cache (if installed)
Write-Host "`n[3/4] Clearing watchman cache..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>&1 | Out-Null
    Write-Host "  Watchman cache cleared" -ForegroundColor Green
} else {
    Write-Host "  Watchman not installed (optional)" -ForegroundColor Gray
}

# Step 4: Reinstall Expo CLI
Write-Host "`n[4/4] Reinstalling Expo CLI..." -ForegroundColor Yellow
npm uninstall -g expo-cli 2>&1 | Out-Null
npm install -g @expo/cli@latest
Write-Host "  Expo CLI reinstalled" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nTry starting Expo again:" -ForegroundColor Yellow
Write-Host "  npx expo start --clear" -ForegroundColor White
Write-Host ""

Write-Host "If the error persists, try:" -ForegroundColor Yellow
Write-Host "  1. Restart your terminal" -ForegroundColor White
Write-Host "  2. Check your internet connection" -ForegroundColor White
Write-Host "  3. Update Node.js to latest LTS version" -ForegroundColor White
Write-Host "  4. Delete node_modules and reinstall:" -ForegroundColor White
Write-Host "     Remove-Item -Recurse -Force node_modules" -ForegroundColor Gray
Write-Host "     npm install" -ForegroundColor Gray
Write-Host ""

