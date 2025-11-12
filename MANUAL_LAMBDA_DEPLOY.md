# Manual Lambda Deployment - Quick Fix

Simple step-by-step to manually deploy Lambda functions when Terraform is locked.

---

## 🚀 Quick Manual Deploy (3 Commands)

### Step 1: Package user-preferences Lambda

```powershell
# Navigate to user preferences function
cd backend/src/user-preferences

# Create zip
Compress-Archive -Path * -DestinationPath function.zip -Force

# Upload to Lambda
aws lambda update-function-code `
  --function-name onewordaday-update-user-profile `
  --zip-file fileb://function.zip

aws lambda update-function-code `
  --function-name onewordaday-get-user-profile `
  --zip-file fileb://function.zip

# Clean up
Remove-Item function.zip

# Go back
cd ../../..
```

### Step 2: Package get-todays-word Lambda

```powershell
# Navigate to get-todays-word function
cd backend/src/get-todays-word

# Create zip
Compress-Archive -Path * -DestinationPath function.zip -Force

# Upload to Lambda
aws lambda update-function-code `
  --function-name onewordaday-get-todays-word `
  --zip-file fileb://function.zip

# Clean up
Remove-Item function.zip

# Go back
cd ../../..
```

### Step 3: Test

```powershell
# Wait 10 seconds for Lambda to update
Start-Sleep -Seconds 10

# Clear browser cache and test
# Ctrl + Shift + R in browser
```

---

## ✅ Expected Result

After deployment:
- ✅ Profile shows correct name and email
- ✅ No 500 errors
- ✅ Onboarding completes successfully
- ✅ Auto sign-in works after confirmation

---

## 🔍 Verify Deployment

```powershell
# Check function update time
aws lambda get-function `
  --function-name onewordaday-update-user-profile `
  --query 'Configuration.LastModified'

# Should show current timestamp
```

---

## 📋 All Lambda Functions to Update

If you want to update all functions:

```powershell
# Feedback
cd backend/src/feedback
Compress-Archive -Path * -DestinationPath function.zip -Force
aws lambda update-function-code --function-name onewordaday-submit-feedback --zip-file fileb://function.zip
Remove-Item function.zip
cd ../../..

# History
cd backend/src/word-history
Compress-Archive -Path * -DestinationPath function.zip -Force
aws lambda update-function-code --function-name onewordaday-get-history --zip-file fileb://function.zip
Remove-Item function.zip
cd ../../..
```

---

## 🎯 Quick Copy-Paste

```powershell
# User Preferences Lambda
cd backend/src/user-preferences
Compress-Archive -Path * -DestinationPath function.zip -Force
aws lambda update-function-code --function-name onewordaday-update-user-profile --zip-file fileb://function.zip
aws lambda update-function-code --function-name onewordaday-get-user-profile --zip-file fileb://function.zip
Remove-Item function.zip
cd ../../..

# Get Todays Word Lambda
cd backend/src/get-todays-word
Compress-Archive -Path * -DestinationPath function.zip -Force
aws lambda update-function-code --function-name onewordaday-get-todays-word --zip-file fileb://function.zip
Remove-Item function.zip
cd ../../..

Write-Host "Lambda functions updated! Test your app now." -ForegroundColor Green
```

Copy and paste this entire block into PowerShell!

---

## ⏱️ Time: 1-2 minutes

This is the **fastest** way to update Lambda without waiting for Terraform!

