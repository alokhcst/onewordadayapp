# Windows PowerShell Commands for One Word A Day

Quick reference for Windows users deploying and managing the app.

---

## 📦 Initial Setup

### Install Dependencies

```powershell
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### Configure AWS

```powershell
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
# Output format: json
```

### Verify AWS Setup

```powershell
aws sts get-caller-identity
```

---

## 🏗️ Deploy Infrastructure

### Build Lambda Functions

```powershell
cd backend
npm run build
cd ..
```

### Initialize Terraform

```powershell
cd terraform
terraform init
```

### Plan Deployment

```powershell
terraform plan
```

### Deploy

```powershell
terraform apply
# Type: yes
```

---

## 🔧 Post-Deployment

### Get Outputs

```powershell
# Still in terraform directory
$USER_POOL_ID = terraform output -raw cognito_user_pool_id
$CLIENT_ID = terraform output -raw cognito_client_id
$API_URL = terraform output -raw api_gateway_url

Write-Host "User Pool ID: $USER_POOL_ID"
Write-Host "Client ID: $CLIENT_ID"
Write-Host "API URL: $API_URL"
```

### Create .env File

```powershell
cd ..

# Create .env file with outputs
@"
EXPO_PUBLIC_USER_POOL_ID=$USER_POOL_ID
EXPO_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID
EXPO_PUBLIC_API_ENDPOINT=$API_URL
"@ | Out-File -FilePath .env -Encoding utf8
```

### Populate Word Bank

```powershell
cd backend
$env:WORD_BANK_TABLE = "onewordaday-production-word-bank"
node populate-word-bank.js
cd ..
```

---

## 🚀 Run the App

### Start Expo

```powershell
npx expo start
```

### Clear Cache (if needed)

```powershell
npx expo start --clear
```

### Run on Specific Platform

```powershell
# Android
npx expo start --android

# iOS
npx expo start --ios
```

---

## 🧪 Testing & Debugging

### Manually Trigger Word Generation

```powershell
aws lambda invoke `
  --function-name onewordaday-production-word-generation `
  --payload '{}' `
  response.json

Get-Content response.json | ConvertFrom-Json
```

### View Lambda Logs

```powershell
# Word generation logs
aws logs tail /aws/lambda/onewordaday-production-word-generation --follow

# API logs
aws logs tail /aws/lambda/onewordaday-production-get-todays-word --follow
```

### Check DynamoDB Tables

```powershell
# List all tables
aws dynamodb list-tables

# Count items in word bank
aws dynamodb scan `
  --table-name onewordaday-production-word-bank `
  --select COUNT `
  --query 'Count'

# View recent daily words
aws dynamodb scan `
  --table-name onewordaday-production-daily-words `
  --max-items 5
```

### Test API Endpoint

```powershell
# Get API URL
$API_URL = terraform -chdir=terraform output -raw api_gateway_url

# Test endpoint (requires auth token)
curl "$API_URL/word/today" -Headers @{Authorization="Bearer YOUR_TOKEN"}
```

---

## 📊 Monitoring

### View CloudWatch Logs

```powershell
# List log groups
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `onewordaday`)].logGroupName'

# Tail specific log
aws logs tail /aws/lambda/onewordaday-production-word-generation --follow --format short
```

### Check EventBridge Rules

```powershell
# List rules
aws events list-rules --name-prefix onewordaday

# Describe specific rule
aws events describe-rule --name onewordaday-production-daily-word-generation
```

### View S3 Buckets

```powershell
# List buckets
aws s3 ls | Select-String onewordaday

# View contents
aws s3 ls s3://onewordaday-production-word-bank/
```

---

## 🔄 Update & Maintenance

### Update Lambda Functions

```powershell
cd backend
npm run build
cd ../terraform
terraform apply
```

### Update Frontend

```powershell
npm install
npx expo start
```

### View Terraform State

```powershell
cd terraform
terraform show
```

### Refresh Terraform State

```powershell
terraform refresh
```

---

## 🧹 Cleanup

### Destroy Infrastructure

```powershell
cd terraform
terraform destroy
# Type: yes
```

### Clean Build Artifacts

```powershell
# Clean backend builds
Remove-Item -Recurse -Force backend/dist
Remove-Item -Force backend/layers/dependencies.zip

# Clean node modules (if needed)
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend/node_modules
```

---

## 🛠️ Troubleshooting Commands

### Terraform Issues

```powershell
# Format terraform files
cd terraform
terraform fmt -recursive

# Validate configuration
terraform validate

# Show current state
terraform state list
```

### NPM Issues

```powershell
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install
```

### AWS Credential Issues

```powershell
# Check current credentials
aws sts get-caller-identity

# List available profiles
aws configure list-profiles

# Use specific profile
$env:AWS_PROFILE = "your-profile-name"
```

### Expo Issues

```powershell
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Check Expo version
npx expo --version
```

---

## 📝 Useful Aliases

Add these to your PowerShell profile for quick access:

```powershell
# Edit profile
notepad $PROFILE

# Add these functions:
function tf-apply { cd terraform; terraform apply; cd .. }
function tf-destroy { cd terraform; terraform destroy; cd .. }
function tf-output { terraform -chdir=terraform output }
function app-start { npx expo start }
function app-clean { npx expo start --clear }
function logs-word-gen { aws logs tail /aws/lambda/onewordaday-production-word-generation --follow }
function populate-words { 
    cd backend
    $env:WORD_BANK_TABLE = "onewordaday-production-word-bank"
    node populate-word-bank.js
    cd ..
}
```

---

## 🔐 Security Commands

### Rotate AWS Credentials

```powershell
# Create new access key
aws iam create-access-key --user-name your-username

# Update credentials
aws configure

# Delete old key
aws iam delete-access-key --access-key-id OLD_KEY_ID --user-name your-username
```

### Check IAM Permissions

```powershell
# Get current user
aws sts get-caller-identity

# List policies for user
aws iam list-attached-user-policies --user-name your-username
```

---

## 📦 Package & Deploy

### Create Lambda Layer

```powershell
cd backend
mkdir -p layers/nodejs
cd layers/nodejs
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb axios uuid

cd ..
Compress-Archive -Path nodejs -DestinationPath dependencies.zip -Force
Remove-Item -Recurse -Force nodejs
cd ../..
```

### Build All Functions

```powershell
cd backend
npm run build

# Verify builds
Get-ChildItem dist/*.zip
cd ..
```

---

## 🎯 Quick Deployment Script

Save as `deploy.ps1`:

```powershell
#!/usr/bin/env pwsh

Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan

# Build backend
Write-Host "`n📦 Building Lambda functions..." -ForegroundColor Yellow
cd backend
npm install
npm run build
cd ..

# Deploy infrastructure
Write-Host "`n🏗️ Deploying infrastructure..." -ForegroundColor Yellow
cd terraform
terraform apply -auto-approve
$USER_POOL_ID = terraform output -raw cognito_user_pool_id
$CLIENT_ID = terraform output -raw cognito_client_id
$API_URL = terraform output -raw api_gateway_url
cd ..

# Create .env
Write-Host "`n📝 Creating .env file..." -ForegroundColor Yellow
@"
EXPO_PUBLIC_USER_POOL_ID=$USER_POOL_ID
EXPO_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID
EXPO_PUBLIC_API_ENDPOINT=$API_URL
"@ | Out-File -FilePath .env -Encoding utf8

# Populate word bank
Write-Host "`n📚 Populating word bank..." -ForegroundColor Yellow
cd backend
$env:WORD_BANK_TABLE = "onewordaday-production-word-bank"
node populate-word-bank.js
cd ..

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`n📱 Run 'npx expo start' to launch the app" -ForegroundColor Cyan
```

Run with:
```powershell
.\deploy.ps1
```

---

## 💡 Pro Tips for Windows

1. **Use Windows Terminal** for better experience
2. **Enable execution policy** for scripts:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. **Use VS Code** with PowerShell extension
4. **Create shortcuts** for common commands
5. **Set AWS_REGION** environment variable to avoid specifying it each time

---

## 🆘 Common Windows-Specific Issues

### Long Path Names

```powershell
# Enable long paths
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Line Ending Issues

```powershell
# Configure git to handle line endings
git config --global core.autocrlf true
```

### Permission Issues

```powershell
# Run as Administrator if needed
Start-Process powershell -Verb runAs
```

---

Happy coding! 🎉

