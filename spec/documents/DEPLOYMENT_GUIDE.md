# One Word A Day - Unified Deployment Guide

## Overview

All deployment and maintenance tasks are now consolidated into a **single PowerShell script**: `scripts/deploy.ps1`

This unified script replaces multiple individual scripts and provides a consistent, easy-to-use interface for all deployment operations.

---

## Quick Start

### First-Time Deployment

```powershell
# Complete deployment (infrastructure + backend + frontend)
.\scripts\deploy.ps1 -Action full
```

### After Code Changes

```powershell
# Quick redeploy (Lambda + Web only, no infrastructure changes)
.\scripts\deploy.ps1 -Action quick
```

### Check Deployment Status

```powershell
# Show what's deployed
.\scripts\deploy.ps1 -Action status

# Show web app URLs
.\scripts\deploy.ps1 -Action urls
```

---

## Available Actions

### 1. **`full`** - Complete Deployment
Deploys everything: infrastructure, Lambda functions, and web app.

```powershell
.\scripts\deploy.ps1 -Action full
```

**Use when:**
- First-time setup
- Major infrastructure changes
- Adding new resources

**What it does:**
1. ✅ Runs Terraform to create/update infrastructure
2. ✅ Verifies API secrets configuration
3. ✅ Builds and deploys web app
4. ✅ Runs verification tests

---

### 2. **`infra`** - Infrastructure Only
Deploys only Terraform infrastructure (no app deployment).

```powershell
.\scripts\deploy.ps1 -Action infra
```

**Use when:**
- Updating Terraform configuration
- Adding new AWS resources
- Changing infrastructure settings

---

### 3. **`lambda`** - Lambda Functions Only
Deploys only Lambda functions via Terraform.

```powershell
.\scripts\deploy.ps1 -Action lambda
```

**Use when:**
- Backend code changes
- Lambda function updates
- No web app changes needed

**What it deploys:**
- `onewordaday-production-get-todays-word`
- `onewordaday-production-user-preferences`
- `onewordaday-production-feedback-processor`
- `onewordaday-production-word-history`

---

### 4. **`web`** - Web App Only
Builds and deploys only the frontend web application.

```powershell
.\scripts\deploy.ps1 -Action web
```

**Use when:**
- Frontend code changes
- UI updates
- No backend changes needed

**What it does:**
1. Builds web app (`npx expo export --platform web`)
2. Uploads to S3
3. Invalidates CloudFront cache

**Options:**
```powershell
# Skip build (use existing dist/)
.\scripts\deploy.ps1 -Action web -SkipBuild
```

---

### 5. **`quick`** - Quick Deploy ⚡
Fast deployment of Lambda + Web (most common during development).

```powershell
.\scripts\deploy.ps1 -Action quick
```

**Use when:**
- Code changes to both backend and frontend
- Quick iteration during development
- No infrastructure changes

**What it does:**
1. ✅ Deploys Lambda functions
2. ✅ Builds and deploys web app
3. ✅ Invalidates CloudFront cache

**⏱️ Time:** ~2-3 minutes

---

### 6. **`force-lambda`** - Force Lambda Deploy
Directly uploads Lambda code via AWS CLI (bypasses Terraform).

```powershell
.\scripts\deploy.ps1 -Action force-lambda
```

**⚠️ Use with caution!**
- Bypasses Terraform state
- Only for quick testing/debugging
- Not recommended for production

**Use when:**
- Terraform state is locked
- Emergency hotfix needed
- Quick testing of Lambda changes

---

### 7. **`cleanup-user`** - Remove User
Completely removes a user from Cognito and DynamoDB.

```powershell
.\scripts\deploy.ps1 -Action cleanup-user -Email "user@example.com"
```

**Use when:**
- Removing test users
- User requests account deletion
- Debugging user-specific issues

**What it does:**
1. Deletes user from Cognito User Pool
2. Deletes user profile from Users DynamoDB table
3. Deletes user's daily words from DailyWords table

**Example:**
```powershell
# Remove test user
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"
```

---

### 8. **`logs`** - Check Lambda Logs
Views recent CloudWatch logs for Lambda functions.

```powershell
# View all function logs
.\scripts\deploy.ps1 -Action logs

# View specific function logs
.\scripts\deploy.ps1 -Action logs -Function "user-preferences"
```

**Function names:**
- `get-todays-word`
- `user-preferences`
- `feedback-processor`
- `word-history`
- `word-generation`
- `content-enrichment`
- `notification-dispatcher`

**Example:**
```powershell
# Check user-preferences function logs
.\scripts\deploy.ps1 -Action logs -Function user-preferences

# Check all logs
.\scripts\deploy.ps1 -Action logs
```

---

### 9. **`urls`** - Show Web App URLs
Displays all deployment URLs.

```powershell
.\scripts\deploy.ps1 -Action urls
```

**Shows:**
- ✅ CloudFront URL (HTTPS - secure)
- S3 Website URL (HTTP - basic)
- CloudFront Distribution ID
- S3 Bucket name
- API Gateway endpoint

---

### 10. **`status`** - Deployment Status
Shows current deployment status of all components.

```powershell
.\scripts\deploy.ps1 -Action status
```

**Shows:**
- ✅ Infrastructure status
- ✅ Lambda function status
- ✅ API Gateway status
- ✅ Cognito configuration
- ✅ Secrets configuration

---

## Common Options

### `-Environment`
Specify deployment environment (default: `production`)

```powershell
.\scripts\deploy.ps1 -Action full -Environment staging
```

### `-AutoApprove`
Skip confirmation prompts (use with caution)

```powershell
.\scripts\deploy.ps1 -Action full -AutoApprove
```

### `-SkipBuild`
Skip web app build (use existing `dist/` folder)

```powershell
.\scripts\deploy.ps1 -Action web -SkipBuild
```

### `-SkipTests`
Skip verification tests

```powershell
.\scripts\deploy.ps1 -Action full -SkipTests
```

---

## Common Workflows

### Daily Development

```powershell
# Make code changes, then:
.\scripts\deploy.ps1 -Action quick

# Clear browser cache and test
```

### First-Time Setup

```powershell
# 1. Clone repository
# 2. Configure terraform.tfvars
# 3. Deploy everything
.\scripts\deploy.ps1 -Action full

# 4. Get your web app URL
.\scripts\deploy.ps1 -Action urls
```

### Backend Changes Only

```powershell
# Update Lambda code, then:
.\scripts\deploy.ps1 -Action lambda

# View logs to verify
.\scripts\deploy.ps1 -Action logs
```

### Frontend Changes Only

```powershell
# Update React/Expo code, then:
.\scripts\deploy.ps1 -Action web

# View deployed app
.\scripts\deploy.ps1 -Action urls
```

### Debugging Issues

```powershell
# 1. Check deployment status
.\scripts\deploy.ps1 -Action status

# 2. Check specific function logs
.\scripts\deploy.ps1 -Action logs -Function user-preferences

# 3. Clean up test user if needed
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"

# 4. Redeploy
.\scripts\deploy.ps1 -Action quick
```

### Emergency Hotfix

```powershell
# 1. Fix code
# 2. Force deploy Lambda (faster than Terraform)
.\scripts\deploy.ps1 -Action force-lambda

# 3. Deploy web if needed
.\scripts\deploy.ps1 -Action web -SkipBuild

# 4. Follow up with proper Terraform deploy later
.\scripts\deploy.ps1 -Action lambda
```

---

## Troubleshooting

### "terraform.tfvars not found"

**Solution:**
```powershell
# Copy example and edit
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Edit with your values, then deploy
.\scripts\deploy.ps1 -Action full
```

### "Terraform state locked"

**Solution:**
```powershell
# Option 1: Use force Lambda deploy temporarily
.\scripts\deploy.ps1 -Action force-lambda

# Option 2: Kill terraform process and remove lock file
# Then retry deployment
.\scripts\deploy.ps1 -Action lambda
```

### "No web hosting outputs found"

**Solution:**
```powershell
# Deploy infrastructure first
.\scripts\deploy.ps1 -Action infra

# Then deploy web app
.\scripts\deploy.ps1 -Action web
```

### "Build failed"

**Solution:**
```bash
# Clear caches and retry
rm -rf dist node_modules/.cache .expo
npm install
.\scripts\deploy.ps1 -Action web
```

### Lambda not creating logs

**Solution:**
```powershell
# 1. Check function exists
.\scripts\deploy.ps1 -Action status

# 2. Redeploy Lambda
.\scripts\deploy.ps1 -Action lambda

# 3. Trigger function via web app
# 4. Check logs again
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

---

## Migration from Old Scripts

### Old vs New

| Old Script | New Command |
|-----------|-------------|
| `deploy-all.ps1` | `.\scripts\deploy.ps1 -Action full` |
| `deploy-web.ps1` | `.\scripts\deploy.ps1 -Action web` |
| `redeploy-lambda.ps1` | `.\scripts\deploy.ps1 -Action lambda` |
| `quick-fix-and-deploy.ps1` | `.\scripts\deploy.ps1 -Action quick` |
| `force-deploy-lambda.ps1` | `.\scripts\deploy.ps1 -Action force-lambda` |
| `cleanup-user.ps1` | `.\scripts\deploy.ps1 -Action cleanup-user -Email <email>` |
| `check-logs.ps1` | `.\scripts\deploy.ps1 -Action logs` |
| `get-web-url.ps1` | `.\scripts\deploy.ps1 -Action urls` |

### Benefits of Unified Script

✅ **Single source of truth** - One script to maintain  
✅ **Consistent interface** - Same options across all actions  
✅ **Better error handling** - Comprehensive error messages  
✅ **Colored output** - Easy to read status messages  
✅ **Built-in help** - `.\scripts\deploy.ps1 -Action help`  
✅ **Validation** - Checks prerequisites before deployment  
✅ **Progress tracking** - Clear step-by-step feedback  

---

## Best Practices

### 1. **Use `quick` for Development**
```powershell
# Fast iteration
.\scripts\deploy.ps1 -Action quick
```

### 2. **Use `full` for Production**
```powershell
# Complete, verified deployment
.\scripts\deploy.ps1 -Action full
```

### 3. **Check Status Regularly**
```powershell
# Verify what's deployed
.\scripts\deploy.ps1 -Action status
```

### 4. **Monitor Logs**
```powershell
# Check for errors after deployment
.\scripts\deploy.ps1 -Action logs
```

### 5. **Clean Up Test Users**
```powershell
# Remove test data
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"
```

---

## Getting Help

### Show Help Message
```powershell
.\scripts\deploy.ps1 -Action help
```

### Check Script Documentation
```powershell
Get-Help .\scripts\deploy.ps1 -Detailed
```

### View Examples
```powershell
Get-Help .\scripts\deploy.ps1 -Examples
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ ONE WORD A DAY - DEPLOYMENT QUICK REFERENCE             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ FULL DEPLOY:       .\scripts\deploy.ps1 -Action full   │
│ QUICK DEPLOY:      .\scripts\deploy.ps1 -Action quick  │
│ LAMBDA ONLY:       .\scripts\deploy.ps1 -Action lambda │
│ WEB ONLY:          .\scripts\deploy.ps1 -Action web    │
│                                                         │
│ CHECK STATUS:      .\scripts\deploy.ps1 -Action status │
│ VIEW URLS:         .\scripts\deploy.ps1 -Action urls   │
│ CHECK LOGS:        .\scripts\deploy.ps1 -Action logs   │
│                                                         │
│ CLEANUP USER:      .\scripts\deploy.ps1 -Action        │
│                    cleanup-user -Email user@email.com   │
│                                                         │
│ HELP:              .\scripts\deploy.ps1 -Action help   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Support

### Issues?

1. Check status: `.\scripts\deploy.ps1 -Action status`
2. Check logs: `.\scripts\deploy.ps1 -Action logs`
3. Retry deployment: `.\scripts\deploy.ps1 -Action quick`

### Need More Help?

- See `ARCHITECTURE_FLOW_DIAGRAM.md` for system architecture
- See `CHANGES_SUMMARY.md` for recent changes
- See `USER_NAME_DISPLAY_FIX.md` for authentication details

---

**✅ You now have a single, powerful deployment script for all operations!**

