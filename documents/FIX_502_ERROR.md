# Fix for 502 Bad Gateway Error

## 🔴 Problem

Your Lambda functions were crashing with this error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module /opt/nodejs/node_modules/uuid/dist-node/index.js 
from /var/task/index.js not supported.
```

### Root Cause

The Lambda layer was installing **uuid v9+**, which is **ESM-only** (ES Modules). However, your Lambda functions use **CommonJS** (`require()`), which doesn't support ESM modules. This caused the Lambda to crash immediately on startup, before it could process any requests.

When a Lambda crashes on initialization:
- API Gateway returns **502 Bad Gateway**
- The error appears in CloudWatch Logs
- Your app shows "Request failed with status code 502"

## ✅ Solution

Downgrade the `uuid` package in the Lambda layer to **v8.3.2**, which supports CommonJS.

### Quick Fix (Automated)

Run this command from the `scripts` directory:

```powershell
.\fix-502.ps1
```

This script will:
1. ✅ Rebuild the Lambda layer with `uuid@8.3.2`
2. ✅ Rebuild all Lambda functions
3. ✅ Deploy to AWS via Terraform
4. ✅ Verify the deployment

**Time:** ~3-5 minutes

### Manual Fix (Step by Step)

If you prefer to fix it manually:

#### 1. Rebuild Lambda Layer

```powershell
cd backend

# Remove old layer
Remove-Item -Recurse -Force layers

# Create new layer
New-Item -ItemType Directory -Path "layers\nodejs" -Force
cd layers\nodejs
npm init -y

# Install with uuid v8.3.2
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

# Create zip
cd ..
Compress-Archive -Path "nodejs" -DestinationPath "dependencies.zip" -Force
cd ..\..
```

#### 2. Rebuild Lambda Functions

```powershell
cd backend
npm install
npm run build
cd ..
```

#### 3. Deploy to AWS

```powershell
cd terraform
terraform apply
cd ..
```

#### 4. Wait & Test

- Wait 30-60 seconds for AWS to propagate changes
- Refresh your mobile app
- Try the action again

## 🔍 Verify the Fix

Check CloudWatch logs to confirm it's working:

```powershell
cd scripts
.\check-logs.ps1
```

You should see:
- ✅ No more "ERR_REQUIRE_ESM" errors
- ✅ Normal log entries like "Feedback processor triggered"
- ✅ Successful completions with Duration times

## 📚 Technical Details

### Why did this happen?

The `uuid` package changed its module system:
- **uuid v8.x**: CommonJS (`require()` works)
- **uuid v9+**: ESM only (`require()` fails)

Your Lambda layer was installing the latest version (v10+), causing the incompatibility.

### Alternative Solutions

If you want to use ES Modules in the future:

1. **Convert to ES Modules**: Change Lambda functions to use `import/export`
   - Update `package.json` to include `"type": "module"`
   - Change all `require()` to `import`
   - Update Lambda runtime if needed

2. **Use Node.js built-in**: Your code already uses `crypto.randomUUID()`, so you could remove the `uuid` dependency entirely

3. **Use dynamic imports**: Replace `require('uuid')` with `await import('uuid')`

### Files Affected

- `backend/layers/dependencies.zip` - Lambda layer with dependencies
- All Lambda functions in `backend/dist/*.zip`
- Terraform state (when you apply changes)

## 🎯 Prevention

To prevent this in the future:

1. **Pin dependencies**: Use exact versions in Lambda layer
2. **Test locally**: Use AWS SAM or LocalStack to test Lambda functions
3. **Monitor CloudWatch**: Set up alerts for Lambda errors
4. **Version control**: Track `package-lock.json` for the layer

## 🆘 Still Having Issues?

If the fix doesn't work:

1. **Check logs**: `.\check-logs.ps1` to see current errors
2. **Verify deployment**: `.\diagnose-502.ps1` to check AWS status
3. **Check AWS credentials**: `aws sts get-caller-identity`
4. **Force redeploy**: Delete Lambda functions and redeploy with Terraform

## 📞 Need Help?

Common follow-up issues:

- **"Terraform apply failed"** - Check AWS credentials and permissions
- **"Still getting 502"** - Wait 2-3 minutes for AWS propagation, clear app cache
- **"Different error now"** - Run `.\check-logs.ps1` to see the new error message

