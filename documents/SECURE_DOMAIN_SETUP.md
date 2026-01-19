# Secure Custom Domain Setup

Guide to set up a secure HTTPS custom domain for your One Word A Day web app.

## ✅ You Already Have HTTPS!

Your CloudFront distribution provides HTTPS by default:

```bash
# Get your secure CloudFront URL
cd terraform
terraform output web_app_cloudfront_url
```

This gives you something like: `https://d3pduuz5pmf7gl.cloudfront.net` 🔒

This is already **secure** with AWS's SSL certificate!

---

## 🌐 Option 1: Use CloudFront URL (Recommended for Testing)

**Your app is already secure!** Just use the CloudFront URL:

```
https://[your-distribution-id].cloudfront.net
```

**Benefits:**
- ✅ HTTPS enabled
- ✅ Global CDN
- ✅ No additional cost
- ✅ Works immediately

---

## 🎯 Option 2: Add Custom Domain (Production)

For a professional domain like `https://app.onewordaday.com`:

### Prerequisites

1. **Own a domain** (e.g., from Route 53, GoDaddy, Namecheap)
2. **Domain in Route 53** (or ability to change DNS)

### Step 1: Request SSL Certificate

**Important:** Certificate MUST be in `us-east-1` for CloudFront!

```bash
# Request certificate in us-east-1
aws acm request-certificate \
  --domain-name app.onewordaday.com \
  --validation-method DNS \
  --region us-east-1
```

**Output:**
```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789:certificate/abc-123..."
}
```

Save this ARN!

### Step 2: Validate Certificate

1. **Get validation records:**
   ```bash
   aws acm describe-certificate \
     --certificate-arn "arn:aws:acm:us-east-1:123456789:certificate/abc-123..." \
     --region us-east-1
   ```

2. **Add DNS records** to your domain:
   - Go to Route 53 (or your DNS provider)
   - Add the CNAME record shown in the output
   - Wait 5-30 minutes for validation

3. **Check validation status:**
   ```bash
   aws acm describe-certificate \
     --certificate-arn "arn:aws:acm:us-east-1:123456789:certificate/abc-123..." \
     --region us-east-1 \
     --query "Certificate.Status"
   ```

   Wait for: `"ISSUED"`

### Step 3: Update Terraform Configuration

Edit `terraform/main.tf`:

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name              = var.project_name
  environment           = var.environment
  cloudfront_price_class = "PriceClass_100"
  log_retention_days    = 7
  
  # Add custom domain configuration
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123..."
  custom_domain       = "app.onewordaday.com"
}
```

### Step 4: Apply Terraform

```bash
cd terraform
terraform apply
```

This updates CloudFront with your custom domain (takes 15-20 minutes).

### Step 5: Configure DNS

After Terraform completes:

```bash
# Get CloudFront domain
terraform output web_app_cloudfront_url
# Output: https://d3pduuz5pmf7gl.cloudfront.net
```

**Add CNAME record in Route 53:**

1. Go to Route 53 → Hosted Zones → Your Domain
2. Create Record:
   - **Name:** `app`
   - **Type:** `CNAME`
   - **Value:** `d3pduuz5pmf7gl.cloudfront.net` (without https://)
   - **TTL:** 300

OR use **Alias record** (recommended for Route 53):
   - **Name:** `app`
   - **Type:** `A` (Alias)
   - **Alias Target:** Select your CloudFront distribution
   - **Routing:** Simple

### Step 6: Test

Wait 5-10 minutes for DNS propagation, then visit:

```
https://app.onewordaday.com
```

✅ Secure custom domain working!

---

## 🚀 Quick Setup Script

Create `scripts/setup-custom-domain.ps1`:

```powershell
#!/usr/bin/env pwsh
# Setup custom domain for web app

param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,
    
    [string]$Region = "us-east-1"
)

Write-Host "Setting up custom domain: $DomainName" -ForegroundColor Cyan
Write-Host ""

# Step 1: Request certificate
Write-Host "[1/3] Requesting SSL certificate..." -ForegroundColor Cyan

$certArn = aws acm request-certificate `
    --domain-name $DomainName `
    --validation-method DNS `
    --region $Region `
    --query "CertificateArn" `
    --output text

Write-Host "  Certificate ARN: $certArn" -ForegroundColor Green
Write-Host ""

# Step 2: Get validation records
Write-Host "[2/3] Getting DNS validation records..." -ForegroundColor Cyan

Start-Sleep -Seconds 3

$validationRecords = aws acm describe-certificate `
    --certificate-arn $certArn `
    --region $Region `
    --query "Certificate.DomainValidationOptions[0].ResourceRecord" `
    --output json | ConvertFrom-Json

Write-Host "  Add this CNAME record to your DNS:" -ForegroundColor Yellow
Write-Host "  Name:  $($validationRecords.Name)" -ForegroundColor White
Write-Host "  Value: $($validationRecords.Value)" -ForegroundColor White
Write-Host ""

# Step 3: Instructions
Write-Host "[3/3] Next steps:" -ForegroundColor Cyan
Write-Host "  1. Add the CNAME record above to your DNS" -ForegroundColor White
Write-Host "  2. Wait for certificate validation (5-30 min)" -ForegroundColor White
Write-Host "  3. Update terraform/main.tf with:" -ForegroundColor White
Write-Host ""
Write-Host "     acm_certificate_arn = `"$certArn`"" -ForegroundColor Gray
Write-Host "     custom_domain       = `"$DomainName`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Run: terraform apply" -ForegroundColor White
Write-Host "  5. Add CNAME in Route 53 pointing to CloudFront" -ForegroundColor White
Write-Host ""

# Check certificate status
Write-Host "Checking certificate status..." -ForegroundColor Cyan

for ($i = 1; $i -le 12; $i++) {
    Start-Sleep -Seconds 10
    
    $status = aws acm describe-certificate `
        --certificate-arn $certArn `
        --region $Region `
        --query "Certificate.Status" `
        --output text
    
    Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "ISSUED") { "Green" } else { "Yellow" })
    
    if ($status -eq "ISSUED") {
        Write-Host ""
        Write-Host "[SUCCESS] Certificate is ready!" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Certificate ARN (save this):" -ForegroundColor Yellow
Write-Host $certArn -ForegroundColor White
Write-Host ""
```

**Usage:**
```powershell
.\scripts\setup-custom-domain.ps1 -DomainName "app.onewordaday.com"
```

---

## 🔒 Security Features Already Enabled

Your CloudFront distribution already includes:

✅ **HTTPS/SSL** - Encrypted traffic  
✅ **TLS 1.2+** - Modern encryption protocols  
✅ **Compression** - gzip/brotli enabled  
✅ **DDoS Protection** - AWS Shield Standard  
✅ **Edge Locations** - Global CDN for speed  
✅ **Custom Error Pages** - Proper 404/403 handling  

---

## 📊 Cost Comparison

### CloudFront Default Domain (FREE HTTPS)
- **Certificate:** Included
- **Cost:** $0

### Custom Domain
- **Route 53 Hosted Zone:** $0.50/month
- **ACM Certificate:** FREE
- **CloudFront:** Same cost as before
- **Total Additional:** ~$0.50/month

---

## 🧪 Testing Your Secure URL

```bash
# Check SSL certificate
curl -I https://app.onewordaday.com

# Verify HTTPS redirect
curl -I http://app.onewordaday.com
# Should redirect to HTTPS

# Check security headers
curl -v https://app.onewordaday.com 2>&1 | grep -i "ssl\|tls"
```

---

## 🐛 Troubleshooting

### Certificate Stuck in "Pending Validation"

**Cause:** DNS record not added or incorrect

**Solution:**
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:..." \
  --region us-east-1

# Verify DNS record exists
nslookup [validation-record-name]
```

### Custom Domain Shows CloudFront 404

**Cause:** Domain not added to CloudFront alternate names

**Solution:** Make sure you ran `terraform apply` after adding `custom_domain`

### SSL Certificate Error

**Cause:** Certificate not in `us-east-1` region

**Solution:** CloudFront requires certificates in `us-east-1`. Delete and recreate:
```bash
aws acm delete-certificate --certificate-arn "..." --region [wrong-region]
aws acm request-certificate --domain-name "..." --region us-east-1
```

### DNS Not Resolving

**Cause:** DNS propagation delay or incorrect CNAME

**Solution:** 
```bash
# Check DNS propagation
dig app.onewordaday.com

# Should point to CloudFront domain
# If not, wait or check CNAME record
```

---

## 📚 Additional Resources

- [AWS Certificate Manager Docs](https://docs.aws.amazon.com/acm/)
- [CloudFront Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)

---

## ✅ Quick Summary

**For Testing (Immediate):**
```bash
# Use CloudFront URL (already secure!)
terraform output web_app_cloudfront_url
# https://d3pduuz5pmf7gl.cloudfront.net
```

**For Production (Custom Domain):**
1. Request SSL certificate in `us-east-1`
2. Validate via DNS
3. Update `terraform/main.tf` with certificate ARN
4. Run `terraform apply`
5. Add CNAME record to Route 53
6. Access via `https://app.onewordaday.com`

Your app is **already secure with HTTPS** via CloudFront! 🔒✨

