# Enable Google OAuth - Complete Guide

## ✅ What's Been Done

### 1. AWS Amplify Clarification
- **AWS Amplify JS Library** (npm package) - ✅ USED for Cognito authentication
- **AWS Amplify Hosting Service** - ❌ NOT USED (using S3 + CloudFront instead)

The `aws-amplify` package is just a JavaScript library - it's the standard way to use AWS Cognito. You're NOT using any AWS Amplify hosting/deployment services.

### 2. Google OAuth Integration Complete
- ✅ Terraform configured with Google credentials
- ✅ Google Sign-In button added to sign-in screen
- ✅ Signup confirmation flow improved
- ✅ Resend code functionality added
- ✅ Better error handling for all auth flows

---

## 🚀 Deploy Google OAuth (3 Steps)

### Step 1: Update Google Cloud Console

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Find your OAuth client:** `866683407900-11353pna6do2cccdol97jkd5cvqids95`
3. **Add Authorized Redirect URIs:**

```
https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

4. **Add Authorized JavaScript Origins (for web):**

Get your CloudFront URL first:
```powershell
cd terraform
terraform output web_app_cloudfront_url
```

Then add:
```
https://[your-cloudfront-domain].cloudfront.net
http://localhost:19006
```

5. **Click Save**

---

### Step 2: Deploy Infrastructure

```powershell
# Deploy Cognito with Google OAuth
cd terraform
terraform apply
```

Type `yes` when prompted. This creates the Google Identity Provider in Cognito.

---

### Step 3: Deploy Web App

```powershell
# Rebuild and deploy web app with Google Sign-In button
cd ..
.\scripts\quick-fix-and-deploy.ps1
```

---

## 🎯 What Users Will See

### Sign-In Screen

```
┌──────────────────────────────────────┐
│ Welcome Back!                        │
│ Sign in to continue your learning... │
│                                      │
│ Email:                               │
│ [_______________]                    │
│                                      │
│ Password:                            │
│ [_______________]                    │
│                                      │
│ [    Sign In    ]                    │
│                                      │
│ -------- OR --------                 │
│                                      │
│ [ 🔐 Sign in with Google ]           │
│                                      │
│ Don't have an account? Sign Up       │
└──────────────────────────────────────┘
```

---

## 📋 Components Updated

| File | What Changed |
|------|--------------|
| `lib/auth.ts` | Added `signInWithGoogle()` function |
| `contexts/AuthContext.tsx` | Exposed Google sign-in in context |
| `app/(auth)/signin.tsx` | Added Google Sign-In button + UI |
| `app/(auth)/confirm.tsx` | Better error handling + resend code |
| `terraform/terraform.tfvars` | Enabled Google OAuth credentials |

---

## 🔒 Authentication Flow

### Regular Sign-In (Email/Password)
```
User enters email/password
  ↓
AWS Cognito validates
  ↓
User authenticated
  ↓
App loads
```

### Google Sign-In
```
User clicks "Sign in with Google"
  ↓
Redirects to Google login
  ↓
User authorizes
  ↓
Redirects back to app
  ↓
AWS Cognito creates/links user
  ↓
User authenticated
  ↓
App loads
```

---

## 🧪 Testing

### Test Regular Sign-In
1. Go to your web app
2. Click "Sign Up" to create account
3. Verify email
4. Complete onboarding
5. Sign in with email/password

### Test Google Sign-In
1. Go to your web app
2. Click "Sign in with Google"
3. Authorize with Google account
4. Should redirect back and be signed in
5. Profile auto-created with Google info

---

## 🔧 Troubleshooting

### "Invalid redirect_uri" Error

**Cause:** Google Cloud Console doesn't have the correct URI

**Solution:** Add this to Google Cloud Console:
```
https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### "Identity provider not found"

**Cause:** Terraform hasn't been applied

**Solution:**
```powershell
cd terraform
terraform apply
```

### Google button doesn't appear

**Cause:** Web app not rebuilt

**Solution:**
```powershell
.\scripts\quick-fix-and-deploy.ps1
```

### Users can sign in but profile shows wrong data

**Cause:** Lambda functions not updated

**Solution:** Deploy completed by `quick-fix-and-deploy.ps1`

---

## 💡 AWS Amplify Library vs Service

### What You're Using (Good!)
✅ **aws-amplify npm package** - JavaScript library for Cognito
- Just code in your app
- No AWS service
- Free
- Standard way to use Cognito

### What You're NOT Using (Also Good!)
❌ **AWS Amplify Hosting** - Deployment service
- You're using S3 + CloudFront instead
- Cheaper and more control
- No Amplify Hosting involved

**Bottom line:** The `aws-amplify` package is just a helper library. You're still deploying to S3 + CloudFront (not Amplify Hosting).

---

## 📊 Supported Sign-In Methods

After deployment:

| Method | Status | Users |
|--------|--------|-------|
| **Email + Password** | ✅ Enabled | Direct signup |
| **Google OAuth** | ✅ Enabled | Google users |

---

## 🚀 Quick Deploy Commands

```powershell
# 1. Enable Google OAuth in Terraform
cd terraform
terraform apply

# 2. Deploy web app with Google button
cd ..
.\scripts\quick-fix-and-deploy.ps1

# 3. Update Google Cloud Console
# Add redirect URI (see Step 1 above)

# Done! Google OAuth enabled! 🎉
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Terraform applied successfully
- [ ] Google redirect URI added to Google Cloud Console
- [ ] Web app rebuilt and deployed
- [ ] Google button appears on sign-in screen
- [ ] Can sign in with email/password
- [ ] Can sign in with Google
- [ ] Profile shows correct username and email
- [ ] New users get default profile created

---

## 📚 Next Steps

1. Deploy with `quick-fix-and-deploy.ps1`
2. Update Google Cloud Console
3. Test both sign-in methods
4. Enjoy Google OAuth! 🎉

---

## 🎉 Summary

**Confirmed:** 
- ❌ AWS Amplify Hosting NOT USED (using S3 + CloudFront)
- ✅ AWS Amplify JS Library USED (standard Cognito integration)
- ✅ Google OAuth ENABLED and ready to deploy

Run:
```powershell
.\scripts\quick-fix-and-deploy.ps1
```

Then update Google Cloud Console redirect URI and you're done!

