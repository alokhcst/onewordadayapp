# Complete Setup: Squarespace Domain + AWS CloudFront

Step-by-step guide to connect your Squarespace domain to AWS CloudFront with HTTPS.

---

## 🎯 What You Need

1. ✅ Domain managed by Squarespace (darptech.com)
2. ✅ AWS CloudFront distribution (already created)
3. ✅ AWS SSL certificate (we'll create this)
4. ✅ DNS records in Squarespace (we'll add these)

---

## 📋 Complete Step-by-Step

### Step 1: Request SSL Certificate in AWS

**Important:** Certificate MUST be in `us-east-1` region for CloudFront!

```powershell
# Request certificate for your subdomain
aws acm request-certificate `
  --domain-name app.darptech.com `
  --validation-method DNS `
  --region us-east-1
```

**Output:**
```json
{
  "CertificateArn": "arn:aws:acm:us-east-1:123456789:certificate/abc-123-def-456..."
}
```

**Save this ARN!** You'll need it later.

---

### Step 2: Get DNS Validation Records

```powershell
# Get the validation CNAME record
aws acm describe-certificate `
  --certificate-arn "arn:aws:acm:us-east-1:123456789:certificate/abc-123..." `
  --region us-east-1 `
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

**Output:**
```json
{
  "Name": "_abc123.app.darptech.com",
  "Type": "CNAME",
  "Value": "_xyz789.acm-validations.aws."
}
```

**Save these values!**

---

### Step 3: Add Validation Record to Squarespace

1. **Go to Squarespace:** https://account.squarespace.com/domains
2. **Click:** darptech.com → **DNS Settings**
3. **Add CNAME Record:**

```
Host:    _abc123.app.darptech.com
Type:    CNAME
Value:   _xyz789.acm-validations.aws.
TTL:     3600 (default)
```

**Note:** Use the EXACT values from Step 2!

4. **Click Save**

---

### Step 4: Wait for Certificate Validation

Wait 5-30 minutes for AWS to validate:

```powershell
# Check validation status
aws acm describe-certificate `
  --certificate-arn "arn:aws:acm:us-east-1:..." `
  --region us-east-1 `
  --query "Certificate.Status"
```

Wait for: `"ISSUED"`

**While waiting:** Continue to next steps (you can come back)

---

### Step 5: Update Terraform Configuration

Edit `terraform/main.tf`:

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name              = var.project_name
  environment           = var.environment
  cloudfront_price_class = "PriceClass_100"
  log_retention_days    = 7
  
  # Add these lines:
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123..."
  custom_domain       = "app.darptech.com"
}
```

---

### Step 6: Update CloudFront Module

Update `terraform/modules/web-hosting/main.tf` to use the certificate:

Find the `viewer_certificate` block and update it:

```hcl
viewer_certificate {
  # Use custom certificate if provided
  acm_certificate_arn      = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
  ssl_support_method       = var.acm_certificate_arn != "" ? "sni-only" : null
  minimum_protocol_version = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  
  # Use default if no custom cert
  cloudfront_default_certificate = var.acm_certificate_arn == ""
}
```

And add alternate domain names:

```hcl
resource "aws_cloudfront_distribution" "web_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  comment             = "${var.app_name} web distribution"
  
  # Add this line:
  aliases = var.custom_domain != "" ? [var.custom_domain] : []
  
  # ... rest of configuration
}
```

---

### Step 7: Apply Terraform

```bash
cd terraform
terraform apply
```

This updates CloudFront with your custom domain (takes 15-20 minutes).

---

### Step 8: Add App Domain CNAME to Squarespace

Now add the CNAME for your actual app:

1. **Go to Squarespace DNS Settings**
2. **Add CNAME Record:**

```
Host:    app
Type:    CNAME
Value:   d3pduuz5pmf7gl.cloudfront.net
TTL:     3600
```

**Get CloudFront domain:**
```powershell
cd terraform
terraform output web_app_cloudfront_url
# Copy the domain (without https://)
```

3. **Save**

---

### Step 9: Wait and Test

Wait 5-30 minutes for DNS propagation, then:

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

## 🗺️ Complete Flow Diagram

```
┌──────────────────────────┐
│ 1. AWS ACM Certificate   │
│    (us-east-1)           │
│    ↓                     │
│    Validation CNAME      │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 2. Squarespace DNS       │
│    Add validation record │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 3. Certificate Validated │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 4. Update Terraform      │
│    Add cert ARN + domain │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 5. terraform apply       │
│    Update CloudFront     │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 6. Squarespace DNS       │
│    Add app CNAME         │
└──────────────────────────┘
         ↓
┌──────────────────────────┐
│ 7. https://app.darptech  │
│    .com WORKS! 🎉        │
└──────────────────────────┘
```

---

## 💡 Why Two DNS Records in Squarespace?

### Record 1: SSL Certificate Validation (Temporary)
```
_abc123.app.darptech.com → _xyz789.acm-validations.aws.
```
This proves to AWS you own the domain. Needed once.

### Record 2: App Domain (Permanent)
```
app.darptech.com → d3pduuz5pmf7gl.cloudfront.net
```
This points your domain to CloudFront. Permanent.

---

## 📊 Summary

| Component | Where to Configure |
|-----------|-------------------|
| **SSL Certificate** | AWS ACM (us-east-1) - Required! |
| **DNS Records** | Squarespace - 2 records needed |
| **CloudFront Config** | Terraform - Add cert ARN & domain |
| **Web App** | Already deployed! |

---

## 🚀 Quick Command Reference

```powershell
# 1. Request SSL certificate
aws acm request-certificate --domain-name app.darptech.com --validation-method DNS --region us-east-1

# 2. Get validation record
aws acm describe-certificate --certificate-arn "arn:..." --region us-east-1

# 3. Add validation CNAME to Squarespace (manual)

# 4. Wait for validation
aws acm describe-certificate --certificate-arn "arn:..." --region us-east-1 --query "Certificate.Status"

# 5. Update Terraform and apply
terraform apply

# 6. Add app CNAME to Squarespace (manual)

# 7. Test
curl -I https://app.darptech.com
```

---

## ✅ Answer to Your Question:

**YES, you still need AWS SSL certificate** because:
- ✅ CloudFront needs it to serve HTTPS
- ✅ Squarespace only manages DNS (pointing)
- ✅ AWS hosts your app and handles SSL

**NO, you don't need Route 53** because:
- ✅ Squarespace can manage DNS records
- ✅ You can add CNAMEs in Squarespace
- ✅ Saves $0.50/month

**Best of both worlds!** 🎉

See `DNS_SETUP_SQUARESPACE.md` for the complete visual guide!
