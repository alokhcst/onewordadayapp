# Deployment Scripts & Guides

Quick reference for all deployment scripts and documentation.

---

## 🚀 Quick Start

### Complete Deployment (Everything in One Command)

```powershell
.\scripts\deploy-all.ps1
```

This deploys everything: Infrastructure + Backend + Web App

---

## 📜 Available Scripts

### Main Deployment Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **`deploy-all.ps1`** | Complete end-to-end deployment | `.\scripts\deploy-all.ps1` |
| **`deploy-web.ps1`** | Deploy web app only | `.\scripts\deploy-web.ps1 -UseTerraform` |
| **`get-web-url.ps1`** | Show deployment URLs | `.\scripts\get-web-url.ps1` |

### Configuration Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **`fix-secret.ps1`** | Configure API keys (Groq, Unsplash) | `.\scripts\fix-secret.ps1` |
| **`fix-s3-permissions.ps1`** | Fix S3 bucket permissions | `.\scripts\fix-s3-permissions.ps1` |
| **`request-ssl-certificate.ps1`** | Request SSL certificate for custom domain | `.\scripts\request-ssl-certificate.ps1 -DomainName "app.darptech.com"` |
| **`add-dns-record.ps1`** | Add DNS record (Route 53) | `.\scripts\add-dns-record.ps1 -DomainName "darptech.com"` |
| **`setup-custom-domain.ps1`** | Complete custom domain setup | `.\scripts\setup-custom-domain.ps1 -DomainName "app.darptech.com"` |

### Utility Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **`clean-placeholder-words.ps1`** | Clean test data | `.\scripts\clean-placeholder-words.ps1` |

---

## 📚 Documentation Guides

### Getting Started

| Guide | Purpose |
|-------|---------|
| **`COMPLETE_DEPLOYMENT_GUIDE.md`** | 📘 Complete walkthrough from scratch |
| **`WEB_DEPLOYMENT_QUICKSTART.md`** | ⚡ Quick web deployment guide |

### Infrastructure

| Guide | Purpose |
|-------|---------|
| **`DEPLOY_TERRAFORM_WEB.md`** | Terraform-based web deployment |
| **`DEPLOYMENT_WEB_AWS.md`** | Detailed AWS deployment options |

### Custom Domains

| Guide | Purpose |
|-------|---------|
| **`SQUARESPACE_QUICKSTART.md`** | 🎯 Quick setup for Squarespace domains |
| **`SQUARESPACE_COMPLETE_SETUP.md`** | Complete Squarespace integration |
| **`DNS_SETUP_SQUARESPACE.md`** | Squarespace DNS configuration |
| **`DNS_SETUP_GUIDE.md`** | General DNS setup |
| **`SECURE_DOMAIN_SETUP.md`** | SSL certificate and security |

### Features

| Guide | Purpose |
|-------|---------|
| **`GOOGLE_OAUTH_SETUP.md`** | Enable Google Sign-In |

---

## 🎯 Common Workflows

### First Time Deployment

```powershell
# 1. Configure Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars  # Edit with your values

# 2. Deploy everything
cd ..
.\scripts\deploy-all.ps1

# 3. Configure API keys
.\scripts\fix-secret.ps1

# 4. Get your URLs
.\scripts\get-web-url.ps1
```

### Update Web App

```powershell
# Quick rebuild and redeploy
.\scripts\deploy-web.ps1 -UseTerraform
```

### Update Backend (Lambda)

```powershell
cd terraform
terraform apply
```

### Add Custom Domain

```powershell
# 1. Request SSL certificate
.\scripts\request-ssl-certificate.ps1 -DomainName "app.darptech.com"

# 2. Add DNS validation record to Squarespace
#    (shown by script above)

# 3. Wait for validation (5-30 min)

# 4. Update Terraform main.tf with certificate ARN

# 5. Apply changes
cd terraform
terraform apply

# 6. Add app CNAME to Squarespace DNS
#    Host: app
#    Value: [CloudFront domain]
```

### Enable Google OAuth

```powershell
# 1. Edit terraform.tfvars
#    Uncomment google_client_id and google_client_secret

# 2. Update Google Cloud Console
#    Add redirect URI

# 3. Apply Terraform
cd terraform
terraform apply
```

---

## 🧪 Testing & Verification

### Test Deployment

```powershell
# Get URLs
.\scripts\get-web-url.ps1

# Open web app
start https://[your-cloudfront-url].cloudfront.net

# Test API (if you have token)
curl https://[your-api-url]/word/today -H "Authorization: Bearer [token]"
```

### Check Logs

```powershell
# View Lambda logs
aws logs tail /aws/lambda/onewordaday-get-todays-word --follow

# Check recent errors
aws logs filter-pattern /aws/lambda/onewordaday-get-todays-word "ERROR"
```

### Verify Infrastructure

```powershell
cd terraform

# Show all resources
terraform show

# List all outputs
terraform output
```

---

## 🔄 CI/CD (Optional)

For automated deployments, see the GitHub Actions workflow in:
- `DEPLOYMENT_WEB_AWS.md` (CI/CD section)

---

## 🗑️ Cleanup

### Remove Everything

```powershell
# WARNING: This deletes all resources!
cd terraform
terraform destroy

# Manually delete S3 bucket contents first if needed
aws s3 rm s3://onewordaday-web-production/ --recursive
```

---

## 💡 Tips

### Faster Deployments

```powershell
# Skip tests for faster deployment
.\scripts\deploy-all.ps1 -SkipTests

# Auto-approve (no prompts)
.\scripts\deploy-all.ps1 -AutoApprove
```

### Partial Deployments

```powershell
# Only infrastructure
.\scripts\deploy-all.ps1 -SkipWeb

# Only web app
.\scripts\deploy-all.ps1 -SkipInfrastructure
```

### Development vs Production

```powershell
# Deploy to dev environment
.\scripts\deploy-all.ps1 -Environment dev

# Deploy to production
.\scripts\deploy-all.ps1 -Environment production
```

---

## 📊 Monitoring

### CloudWatch Dashboard

```powershell
# Create custom dashboard (manual in AWS Console)
# CloudWatch > Dashboards > Create dashboard

# Add widgets for:
# - Lambda invocations
# - API Gateway requests
# - DynamoDB read/write capacity
# - CloudFront requests
```

### Cost Monitoring

```powershell
# View costs
# AWS Console > Cost Management > Cost Explorer

# Set up budget alerts
aws budgets create-budget --account-id [ID] --budget ...
```

---

## 🆘 Support

### Debugging Steps

1. Check deployment status: `.\scripts\deploy-all.ps1 -SkipInfrastructure -SkipWeb`
2. View logs: AWS Console > CloudWatch > Logs
3. Check Terraform state: `cd terraform && terraform show`
4. Verify secrets: `.\scripts\fix-secret.ps1`
5. Test endpoints manually

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Module not installed" | Run `terraform init` |
| "403 Access Denied" | Run `.\scripts\fix-s3-permissions.ps1` |
| "500 Internal Server Error" | Check Lambda logs in CloudWatch |
| "Invalid code" | User already confirmed or wrong code |
| "Certificate not found" | Request certificate first |

---

## ✨ Summary

**One command to deploy everything:**
```powershell
.\scripts\deploy-all.ps1
```

**Quick updates:**
```powershell
.\scripts\deploy-web.ps1 -UseTerraform
```

**Get your URLs:**
```powershell
.\scripts\get-web-url.ps1
```

That's it! Happy deploying! 🚀

