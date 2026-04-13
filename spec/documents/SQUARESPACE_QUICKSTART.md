# Squarespace + AWS CloudFront - Quick Setup

**5-minute setup** to connect your Squarespace domain to AWS CloudFront with HTTPS.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Request SSL Certificate

```powershell
# Request certificate for your subdomain
.\scripts\request-ssl-certificate.ps1 -DomainName "app.darptech.com"
```

**This script will:**
- ✅ Request SSL certificate from AWS
- ✅ Show you the DNS validation record
- ✅ Monitor validation status
- ✅ Give you the certificate ARN

**Output will look like:**
```
Add this DNS record in Squarespace:

Host:  _abc123def.app.darptech.com
Type:  CNAME
Value: _xyz789.acm-validations.aws.
TTL:   3600

Certificate ARN: arn:aws:acm:us-east-1:268017144546:certificate/real-arn-here
```

---

### Step 2: Add DNS Records in Squarespace

Go to: https://account.squarespace.com/domains

#### Record 1: SSL Validation (from Step 1 output)

```
Host:  _abc123def.app.darptech.com
Type:  CNAME
Value: _xyz789.acm-validations.aws.
```

Click **"Add"** → **"Save"**

#### Record 2: App Domain (get CloudFront from Terraform)

```powershell
# Get your CloudFront domain
cd terraform
terraform output web_app_cloudfront_url
# Example: https://d3pduuz5pmf7gl.cloudfront.net
```

Add CNAME in Squarespace:
```
Host:  app
Type:  CNAME
Value: d3pduuz5pmf7gl.cloudfront.net
```

Click **"Add"** → **"Save"**

---

### Step 3: Update Terraform and Deploy

Edit `terraform/main.tf` and update the web_hosting module:

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name              = var.project_name
  environment           = var.environment
  cloudfront_price_class = "PriceClass_100"
  log_retention_days    = 7
  
  # Add these lines (use ARN from Step 1):
  acm_certificate_arn = "arn:aws:acm:us-east-1:268017144546:certificate/your-real-arn"
  custom_domain       = "app.darptech.com"
}
```

Apply changes:

```bash
cd terraform
terraform apply
```

Wait 15-20 minutes for CloudFront to update.

---

## 🧪 Test

After DNS propagates (5-30 minutes):

```powershell
# Check DNS
nslookup app.darptech.com

# Test HTTPS
curl -I https://app.darptech.com

# Open in browser
start https://app.darptech.com
```

✅ Your app should load with HTTPS!

---

## 📋 Visual Summary

```
Step 1: AWS ACM
  ↓
  Request certificate → Get validation CNAME
  
Step 2: Squarespace DNS
  ↓
  Add validation CNAME → Add app CNAME
  
Step 3: Terraform
  ↓
  Update config → Apply changes
  
Step 4: Test
  ↓
  https://app.darptech.com 🎉
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Request certificate | 1 minute |
| Add DNS records | 2 minutes |
| Certificate validation | 5-30 minutes |
| Update Terraform | 1 minute |
| CloudFront update | 15-20 minutes |
| DNS propagation | 5-30 minutes |
| **Total** | **30-90 minutes** |

Most of this is waiting time - you can do other things!

---

## 🔧 Troubleshooting

### "AccessDeniedException" when requesting certificate

**Cause:** Using placeholder ARN instead of real one

**Solution:** Run the request script to get your own ARN:
```powershell
.\scripts\request-ssl-certificate.ps1 -DomainName "app.darptech.com"
```

### Certificate stuck in "Pending Validation"

**Cause:** DNS record not added to Squarespace

**Solution:**
1. Check Squarespace DNS has the validation CNAME
2. Wait up to 30 minutes
3. Verify: `nslookup _abc123def.app.darptech.com`

### Domain not working after setup

**Checklist:**
- [ ] Certificate status is "ISSUED"
- [ ] Terraform applied successfully
- [ ] App CNAME added to Squarespace
- [ ] Waited at least 30 minutes

---

## 💰 Cost

- **AWS ACM Certificate:** FREE ✅
- **CloudFront:** ~$1-2/month
- **Squarespace DNS:** FREE (included with domain)

**Total additional cost:** $0! 🎉

---

## 🎯 What You're Setting Up

```
https://app.darptech.com (Your custom domain)
        ↓
Squarespace DNS (CNAME record)
        ↓
AWS CloudFront (HTTPS with SSL)
        ↓
Your Web App 🎉
```

---

## ✅ Start Here

```powershell
# Run this to get started:
.\scripts\request-ssl-certificate.ps1 -DomainName "app.darptech.com"

# Follow the instructions shown
# Add DNS records to Squarespace
# Update Terraform
# Done!
```

That's it! Simple 3-step process! 🚀

