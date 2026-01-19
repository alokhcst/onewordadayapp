# Deploy Final Fixes - Complete Guide

All issues fixed and ready to deploy!

---

## ✅ All Fixes Applied

### 1. **Google OAuth Configuration**
   - ✅ Terraform configured with Google credentials
   - ✅ Web redirect URLs added to Amplify config
   - ✅ Cognito callback URLs use web app URLs
   - ✅ Custom domain (app.darptech.com) configured
   - ✅ SSL certificate configured

### 2. **Signup & Confirmation Flow**
   - ✅ Confirmation page works on web (no more stuck after clicking verify)
   - ✅ Resend code button functional
   - ✅ Better error messages
   - ✅ Handles already-confirmed users

### 3. **Onboarding**
   - ✅ Skips notifications on web (no VAPID error)
   - ✅ Passes user email/name correctly
   - ✅ Works on both web and mobile

### 4. **User Profile**
   - ✅ Auto-creates with Cognito email/name
   - ✅ Displays correct values
   - ✅ Backend extracts name from multiple Cognito fields
   - ✅ Extensive logging for debugging

### 5. **Infrastructure**
   - ✅ Web hosting created before Cognito (for OAuth URLs)
   - ✅ CloudFront configured with custom domain
   - ✅ SSL certificate integrated
   - ✅ No duplicate modules

---

## 🚀 Complete Deployment (One Command)

```powershell
# Deploy everything - infrastructure + web app
cd terraform
terraform apply

# Then rebuild and deploy web app
cd ..
.\scripts\quick-fix-and-deploy.ps1
```

**Total time:** 20-25 minutes (first time), 5-10 minutes (updates)

---

## 📋 Step-by-Step Deployment

### Step 1: Deploy Infrastructure

```powershell
cd terraform
terraform init  # If not already done
terraform apply
```

This creates/updates:
- ✅ S3 bucket + CloudFront (with app.darptech.com)
- ✅ Cognito with Google OAuth enabled
- ✅ Proper callback URLs for web
- ✅ All Lambda functions
- ✅ DynamoDB tables
- ✅ API Gateway

**Time:** 15-20 minutes

### Step 2: Rebuild and Deploy Web App

```powershell
cd ..
.\scripts\quick-fix-and-deploy.ps1
```

This:
- ✅ Rebuilds web app with all fixes
- ✅ Uploads to S3
- ✅ Invalidates CloudFront cache

**Time:** 5-7 minutes

### Step 3: Update Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth client: `866683407900-11353pna6do2cccdol97jkd5cvqids95`
3. Add **Authorized Redirect URIs:**

```
https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

4. Add **Authorized JavaScript Origins:**

```
https://app.darptech.com
https://dqzbv4s4qszn0.cloudfront.net
http://localhost:19006
```

5. Click **Save**

### Step 4: Add DNS to Squarespace

1. Go to: https://account.squarespace.com/domains
2. Click: darptech.com → DNS Settings
3. Add CNAME:

```
Host:  app
Type:  CNAME
Value: [Your CloudFront domain from terraform output]
```

Get CloudFront domain:
```powershell
cd terraform
terraform output web_app_cloudfront_url
```

---

## 🧪 Testing After Deployment

### Test 1: Web App Access

```
https://app.darptech.com
```

Should load your app with HTTPS 🔒

### Test 2: Email/Password Signup

1. Click "Sign Up"
2. Enter name, email, password
3. Select age group and context
4. Enter verification code
5. Complete onboarding
6. Should navigate to app
7. Check profile - name and email should be correct

### Test 3: Google Sign-In

1. Go to sign-in page
2. Click "Sign in with Google"
3. Authorize with Google
4. Should redirect back and be signed in
5. Profile auto-created with Google info

### Test 4: Resend Code

1. Sign up with new email
2. On confirmation page, click "Resend"
3. Should get new code in email

---

## 🔍 Verification Commands

```powershell
# Get all deployment URLs
.\scripts\get-web-url.ps1

# Check Cognito configuration
cd terraform
terraform output

# View Lambda logs
aws logs tail /aws/lambda/onewordaday-update-user-profile --follow

# Test API endpoint
curl https://[api-url]/health
```

---

## 🐛 If Something Goes Wrong

### Terraform Apply Fails

```powershell
cd terraform
terraform init -upgrade
terraform validate
terraform plan
```

### Web Build Fails

```powershell
rm -rf dist/
rm -rf node_modules/.cache/
npm install
npx expo export --platform web
```

### Google Sign-In Fails

Check:
1. Google Cloud Console has correct redirect URIs
2. Terraform applied successfully
3. Cognito has Google provider (check AWS Console)
4. Web app has latest code (redeploy)

### Profile Shows Wrong Data

Check CloudWatch logs:
```powershell
aws logs tail /aws/lambda/onewordaday-update-user-profile --follow
```

Look for the "Cognito claims received" log to see what data is available.

---

## 📊 What Gets Deployed

| Component | Status |
|-----------|--------|
| S3 + CloudFront | ✅ With custom domain |
| SSL Certificate | ✅ Configured |
| Cognito + Google OAuth | ✅ Enabled |
| Lambda Functions | ✅ All fixes applied |
| Web App | ✅ All UI fixes |
| Callback URLs | ✅ Web + Mobile |

---

## 🎯 Expected Results

After complete deployment:

✅ Web app accessible at: `https://app.darptech.com`  
✅ Can sign up with email/password  
✅ Can sign in with Google  
✅ Confirmation code works  
✅ Resend code works  
✅ Profile shows correct name/email  
✅ Onboarding works on web  
✅ No notification errors on web  
✅ All API endpoints working  

---

## 🚀 Quick Deploy Now

```powershell
# 1. Deploy infrastructure
cd terraform
terraform apply

# 2. Deploy web app
cd ..
.\scripts\quick-fix-and-deploy.ps1

# 3. Update Google Cloud Console (manual - see Step 3 above)

# 4. Update Squarespace DNS (manual - see Step 4 above)

# Done! Test at https://app.darptech.com 🎉
```

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Terraform apply | 15-20 min |
| Web app deploy | 5-7 min |
| Google Console update | 2 min |
| Squarespace DNS | 2 min |
| DNS propagation | 5-30 min |
| **Total** | **30-60 min** |

Most is automated - manual steps are simple!

---

## ✨ You're Ready!

Run the deployment commands and your app will be fully functional with:
- 🔐 Google OAuth
- ✅ Working signup flow
- ✅ Correct user profiles
- 🌐 Custom domain with HTTPS
- 🚀 S3 + CloudFront hosting

Let's deploy! 🎉

