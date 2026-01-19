# Complete Deployment Guide - Start to Finish

Complete walkthrough to deploy your One Word A Day app from scratch.

---

## 🚀 One-Command Deployment

```powershell
# Deploy everything!
.\scripts\deploy-all.ps1
```

This script handles:
- ✅ Infrastructure (Terraform)
- ✅ Backend (Lambda functions)
- ✅ Secrets verification
- ✅ Web app build and deployment
- ✅ Verification tests

---

## 📋 Prerequisites Checklist

Before deploying, make sure you have:

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Terraform installed (`terraform --version`)
- [ ] Node.js installed (`node --version`)
- [ ] Git repository cloned
- [ ] Email verified in AWS SES (for notifications)

### Quick Setup

```powershell
# 1. Install AWS CLI
# Download from: https://aws.amazon.com/cli/

# 2. Configure AWS credentials
aws configure
# Enter Access Key ID
# Enter Secret Access Key
# Region: us-east-1
# Output: json

# 3. Install Terraform
# Download from: https://www.terraform.io/downloads

# 4. Install Node.js dependencies
npm install
```

---

## 🎯 Step-by-Step Deployment

### Step 1: Configure Terraform Variables

```powershell
cd terraform

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
notepad terraform.tfvars
```

**Required values:**
```hcl
aws_region = "us-east-1"
environment = "production"
project_name = "onewordaday"
ses_sender_email = "your-email@gmail.com"  # Must be verified in SES
use_ai_generation = "true"

# Optional - leave empty for now
google_client_id = ""
google_client_secret = ""
```

### Step 2: Run Complete Deployment

```powershell
cd ..

# Deploy everything
.\scripts\deploy-all.ps1

# Or with auto-approve (no prompts)
.\scripts\deploy-all.ps1 -AutoApprove
```

**What happens:**
1. Terraform initializes
2. Infrastructure is created (15-20 min for first time)
3. Secrets are verified
4. Web app is built and deployed
5. Tests run automatically

### Step 3: Configure API Keys

After deployment, configure your API keys:

```powershell
# Run the secret configuration script
.\scripts\fix-secret.ps1
```

This will:
1. Check current secret status
2. Guide you to add Groq and Unsplash API keys
3. Validate the keys

**Get free API keys:**
- **Groq:** https://console.groq.com/keys
- **Unsplash:** https://unsplash.com/developers

### Step 4: Access Your App

```powershell
# Get your secure web URL
.\scripts\get-web-url.ps1
```

Open the CloudFront URL in your browser!

---

## 🔄 Deployment Options

### Full Deployment (Recommended)

```powershell
# Deploy everything
.\scripts\deploy-all.ps1
```

### Infrastructure Only

```powershell
# Only deploy AWS infrastructure
.\scripts\deploy-all.ps1 -SkipWeb
```

### Web App Only

```powershell
# Only deploy web app (infrastructure must exist)
.\scripts\deploy-all.ps1 -SkipInfrastructure
```

### Quick Redeploy

```powershell
# Rebuild and redeploy web app
.\scripts\deploy-web.ps1 -UseTerraform
```

---

## 📊 Deployment Components

### What Gets Deployed

| Component | Tool | Time | Result |
|-----------|------|------|--------|
| **DynamoDB Tables** | Terraform | 2-3 min | User data, words, history |
| **Cognito User Pool** | Terraform | 2-3 min | Authentication |
| **Lambda Functions** | Terraform | 3-5 min | Backend API |
| **API Gateway** | Terraform | 2-3 min | REST API endpoints |
| **S3 Bucket** | Terraform | 1 min | Web hosting |
| **CloudFront** | Terraform | 15-20 min | Global CDN + HTTPS |
| **Secrets Manager** | Manual | 2 min | API keys |
| **Web App** | Script | 2-3 min | React app |

**Total first deployment:** ~30-40 minutes  
**Subsequent deployments:** ~5-10 minutes

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│ User's Browser                      │
│ https://[cloudfront].cloudfront.net│
└─────────────────────────────────────┘
         ↓ HTTPS
┌─────────────────────────────────────┐
│ CloudFront CDN (Global)             │
│ - SSL/TLS                           │
│ - Caching                           │
│ - Compression                       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ S3 Bucket (Static Web Hosting)      │
│ - React App                         │
│ - HTML/CSS/JS                       │
└─────────────────────────────────────┘
         ↓ API Calls
┌─────────────────────────────────────┐
│ API Gateway                         │
│ - /word/today                       │
│ - /word/feedback                    │
│ - /history                          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Lambda Functions                    │
│ - get-todays-word                   │
│ - submit-feedback                   │
│ - get-history                       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ DynamoDB Tables                     │
│ - Users                             │
│ - DailyWords                        │
│ - WordBank                          │
└─────────────────────────────────────┘
```

---

## 💰 Cost Estimate

### Monthly Costs (Light Usage)

| Service | Free Tier | After Free Tier | Typical Cost |
|---------|-----------|-----------------|--------------|
| **DynamoDB** | 25GB storage | $0.25/GB | $0.10 |
| **Lambda** | 1M requests free | $0.20/1M | $0.05 |
| **API Gateway** | 1M requests free | $3.50/1M | $0.20 |
| **S3** | 5GB storage | $0.023/GB | $0.05 |
| **CloudFront** | 1TB transfer free | $0.085/GB | $0.50 |
| **Cognito** | 50,000 MAU free | $0.0055/MAU | $0.00 |
| **Secrets Manager** | $0.40/secret | $0.40/secret | $0.40 |

**Total:** ~$1-3/month for typical usage  
**First year (Free Tier):** ~$0.50-1/month

---

## 🔧 Troubleshooting

### Terraform Fails

```powershell
# Check Terraform version
terraform version

# Reinitialize
cd terraform
terraform init -upgrade

# Check for errors
terraform validate
```

### Web Build Fails

```powershell
# Clear cache
rm -rf dist/
rm -rf node_modules/.cache/

# Reinstall dependencies
npm install

# Try build again
npx expo export --platform web
```

### API Keys Not Working

```powershell
# Run secret fix script
.\scripts\fix-secret.ps1

# Test Lambda function
.\scripts\test-get-todays-word.ps1
```

### 403 Error on Web App

```powershell
# Fix S3 permissions
.\scripts\fix-s3-permissions.ps1 -BucketName "onewordaday-web-production"
```

### Lambda Function Errors

```bash
# View Lambda logs
cd terraform
terraform output

# Check CloudWatch logs in AWS Console
# Lambda > Functions > [Function Name] > Monitor > Logs
```

---

## 📚 Useful Commands

### Check Deployment Status

```powershell
# Get all URLs and endpoints
.\scripts\get-web-url.ps1

# Check Terraform outputs
cd terraform
terraform output
```

### Update Deployment

```powershell
# Update infrastructure
cd terraform
terraform apply

# Update web app
cd ..
.\scripts\deploy-web.ps1 -UseTerraform
```

### View Logs

```powershell
# Lambda logs
aws logs tail /aws/lambda/onewordaday-get-todays-word --follow

# CloudFront logs (if enabled)
aws logs tail /aws/cloudfront/onewordaday-web --follow
```

### Destroy Everything

```powershell
# WARNING: This deletes everything!
cd terraform
terraform destroy

# Confirm by typing: yes
```

---

## 🎯 Post-Deployment Checklist

After successful deployment:

- [ ] Web app loads at CloudFront URL
- [ ] Can create account (sign up)
- [ ] Can confirm email
- [ ] Can sign in
- [ ] Gets today's word (or generates one)
- [ ] Can submit feedback
- [ ] Can view history
- [ ] Can skip to next word
- [ ] API keys configured (Groq, Unsplash)
- [ ] Images loading from Unsplash

### Optional Enhancements

- [ ] Custom domain configured (app.darptech.com)
- [ ] SSL certificate validated
- [ ] Google OAuth enabled
- [ ] Monitoring alerts set up
- [ ] Backup strategy configured

---

## 🚨 Common Issues and Fixes

### Issue: "No module named 'module_name'"

**Fix:** Run `terraform init`

### Issue: "AccessDenied" errors

**Fix:** Check AWS credentials:
```powershell
aws sts get-caller-identity
```

### Issue: SES email not verified

**Fix:**
```powershell
# Verify email
aws ses verify-email-identity --email-address your-email@gmail.com

# Check status
aws ses get-identity-verification-attributes --identities your-email@gmail.com
```

### Issue: CloudFront still showing old content

**Fix:**
```powershell
# Invalidate cache
cd terraform
$CF_ID = terraform output -raw web_app_cloudfront_id
cd ..
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

### Issue: User can't sign up

**Fix:** Check Cognito User Pool settings in AWS Console

---

## 📖 Additional Documentation

- **`WEB_DEPLOYMENT_QUICKSTART.md`** - Web deployment only
- **`DEPLOY_TERRAFORM_WEB.md`** - Terraform web hosting details
- **`SQUARESPACE_QUICKSTART.md`** - Custom domain with Squarespace
- **`SECURE_DOMAIN_SETUP.md`** - SSL certificate setup
- **`GOOGLE_OAUTH_SETUP.md`** - Google sign-in setup

---

## 🎉 Success!

If everything deployed successfully:

1. ✅ Infrastructure is running
2. ✅ Backend APIs are live
3. ✅ Web app is accessible
4. ✅ Authentication works
5. ✅ Users can get daily words

**Your app is LIVE!** 🚀

Share your CloudFront URL with users or configure a custom domain for a professional URL.

---

## 💡 Tips

### Development vs Production

```powershell
# Development deployment
.\scripts\deploy-all.ps1 -Environment dev

# Production deployment
.\scripts\deploy-all.ps1 -Environment production
```

### Quick Updates

```powershell
# Only rebuild and deploy web app (fastest)
.\scripts\deploy-web.ps1 -UseTerraform

# Update backend only
cd terraform
terraform apply -target=module.lambda
```

### Monitoring

```powershell
# Check Lambda execution count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=onewordaday-get-todays-word \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

---

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review AWS CloudWatch logs
3. Check Terraform state: `terraform show`
4. Verify all prerequisites are met

---

## 🔄 Maintenance

### Regular Updates

```powershell
# Weekly/monthly updates
git pull
npm install
.\scripts\deploy-all.ps1
```

### Backup

```powershell
# Backup DynamoDB tables (recommended)
# Use AWS Backup or DynamoDB point-in-time recovery

# Export Terraform state (already in S3 if configured)
cd terraform
terraform show > backup-state.txt
```

---

## ✨ You're All Set!

Your complete deployment is ready. Run:

```powershell
.\scripts\deploy-all.ps1
```

And watch everything deploy automatically! 🎉

