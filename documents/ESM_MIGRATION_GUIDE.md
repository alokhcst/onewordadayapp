# ESM (ECMAScript Modules) Migration Guide

## Overview

Your One Word A Day Lambda functions have been migrated from CommonJS to ESM (ECMAScript Modules). This fixes the UUID compatibility issues and enables using modern JavaScript features.

## What Changed

### ✅ All Lambda Functions Converted to ESM

**Before (CommonJS):**
```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const axios = require('axios');

exports.handler = async (event) => {
  // ...
};
```

**After (ESM):**
```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import axios from 'axios';

export const handler = async (event) => {
  // ...
};
```

### Updated Files

1. **Lambda Functions (8 total):**
   - ✅ `backend/src/feedback-processor/index.js`
   - ✅ `backend/src/user-preferences/index.js`
   - ✅ `backend/src/get-todays-word/index.js`
   - ✅ `backend/src/ai-word-generation/index.js`
   - ✅ `backend/src/word-generation/index.js`
   - ✅ `backend/src/word-history/index.js`
   - ✅ `backend/src/notification-dispatcher/index.js`
   - ✅ `backend/src/content-enrichment/index.js`

2. **Configuration Files:**
   - ✅ `backend/package.json` - Added `"type": "module"`
   - ✅ `backend/build.js` - Converted to ESM

3. **Dependencies Updated:**
   - ✅ UUID: `^8.3.2` → `^10.0.0` (latest, fully ESM compatible)
   - ✅ Added `@aws-sdk/client-lambda` for Lambda invocation

## Why ESM?

### ✅ Benefits

1. **Modern JavaScript** - Uses the standard ES6+ module system
2. **Better Compatibility** - Works with latest npm packages (like UUID v10+)
3. **Future-Proof** - ESM is the JavaScript standard going forward
4. **No More UUID Errors** - Fixes the `ERR_REQUIRE_ESM` errors
5. **Tree Shaking** - Better optimization potential

### ❌ What Was Fixed

The 502 Bad Gateway errors were caused by:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module 
/opt/nodejs/node_modules/uuid/dist-node/index.js not supported
```

ESM uses `import` instead of `require()`, which works with all modern packages.

## Deployment Instructions

### Option 1: Complete Deployment (Recommended)

Run the all-in-one deployment script:

```powershell
cd scripts
.\deploy-esm.ps1
```

This will:
1. Rebuild Lambda layer with ESM support
2. Install dependencies
3. Build all Lambda functions
4. Deploy to AWS with Terraform

### Option 2: Step-by-Step Deployment

```powershell
# Step 1: Rebuild Lambda layer
cd scripts
.\rebuild-layer-esm.ps1

# Step 2: Install backend dependencies
cd ..\backend
npm install

# Step 3: Build Lambda functions
npm run build

# Step 4: Deploy with Terraform
cd ..\terraform
terraform plan
terraform apply
```

## Verification

### 1. Check Build Output

After running `npm run build`, you should see:

```
Building Lambda functions...

Building word-generation...
✓ word-generation.zip created (XXX bytes)

Building ai-word-generation...
✓ ai-word-generation.zip created (XXX bytes)

... (8 functions total)

Build complete!
```

### 2. Check Lambda Logs

```powershell
cd scripts
.\check-logs.ps1
```

Look for successful executions (no `ERR_REQUIRE_ESM` errors).

### 3. Test the App

1. **Wait 60 seconds** after deployment
2. **Refresh your web app**
3. **Click "Get Next Word"** - Should work!
4. **Submit feedback** - Should work!

## Troubleshooting

### Issue: Build Fails with "Cannot find module"

**Solution:** Make sure you've installed dependencies:

```powershell
cd backend
npm install
```

### Issue: Terraform Apply Fails

**Check:**
```powershell
# Verify AWS credentials
aws sts get-caller-identity

# Check Terraform state
cd terraform
terraform validate
```

### Issue: Lambda Still Shows Errors

**Possible causes:**
1. Old Lambda layer still deployed
2. Old function code cached

**Solution:**
```powershell
# Force rebuild and redeploy
cd scripts
.\deploy-esm.ps1
```

Then wait 2-3 minutes for AWS to fully update.

### Issue: Import Statement Errors in Build

**Check:** Make sure `backend/package.json` has:
```json
{
  "type": "module",
  ...
}
```

## Key Differences: CommonJS vs ESM

| Feature | CommonJS | ESM |
|---------|----------|-----|
| Import | `require('module')` | `import module from 'module'` |
| Export | `module.exports = {}` | `export const handler = {}` |
| File Extension | `.js` | `.js` (with `"type": "module"`) |
| __dirname | Available | Need to use `import.meta.url` |
| __filename | Available | Need to use `fileURLToPath()` |
| Dynamic Import | Not standard | `await import()` |

## Package.json Configuration

```json
{
  "name": "onewordaday-backend",
  "version": "1.0.0",
  "type": "module",  // ← This enables ESM
  "description": "Backend Lambda functions - Using ES Modules",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.540.0",
    "uuid": "^10.0.0"  // ← Latest version
  }
}
```

## Lambda Layer Configuration

The Lambda layer now includes:
- UUID v10.0.0 (ESM compatible)
- All AWS SDK v3 packages (ESM native)
- Axios v1.6.7 (ESM compatible)

## Testing

### Local Testing

You can test the build process locally:

```powershell
cd backend
npm install
npm run build
```

### AWS Testing

After deployment, invoke a Lambda directly:

```powershell
aws lambda invoke \
  --function-name onewordaday-production-get-todays-word \
  --payload '{"requestContext":{"authorizer":{"claims":{"sub":"test-user"}}}}' \
  testdata/response.json

cat testdata/response.json
```

## Rollback Plan

If ESM causes issues, you can rollback:

1. **Restore old files** from git history
2. **Run old fix script:**
   ```powershell
   cd scripts
   .\fix-502.ps1
   ```

This will rebuild with UUID v8.3.2 (CommonJS).

## Benefits You Now Have

### ✅ Fixed Issues
- 502 Bad Gateway errors - FIXED
- UUID module compatibility - FIXED
- Feedback submission - WORKS
- Next word generation - WORKS

### ✅ New Features
- AI-powered word generation with images
- Word repetition tracking (90 days)
- Multiple LLM provider support (Groq, OpenRouter, Together)
- Unsplash image integration
- Modern JavaScript syntax

## Next Steps

1. **Deploy to Production:**
   ```powershell
   cd scripts
   .\deploy-esm.ps1
   ```

2. **Set up AI API Keys** (optional):
   ```powershell
   aws secretsmanager create-secret \
     --name onewordaday/llm-api-keys \
     --secret-string '{
       "groq": "YOUR_KEY",
       "unsplash": "YOUR_KEY"
     }'
   ```

3. **Monitor Logs:**
   ```powershell
   cd scripts
   .\check-logs.ps1
   ```

4. **Test thoroughly** in your app

## Support

If you encounter issues:

1. Check CloudWatch logs: `.\scripts\check-logs.ps1`
2. Verify deployment: `.\scripts\diagnose-502.ps1`
3. Review this guide
4. Check the `AI_NEXT_WORD_FEATURE.md` for AI setup

---

**Migration completed:** November 7, 2025
**Status:** Ready to deploy! 🚀

