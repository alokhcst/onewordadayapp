# DNS Setup Guide - Point Your Domain to CloudFront

Quick guide to add a DNS record in Route 53 to point your domain to CloudFront.

---

## 🚀 Quick Method (Automated Script)

```powershell
# Run this script - it does everything automatically!
.\scripts\add-dns-record.ps1 -DomainName "darptech.com"
```

The script will:
1. ✅ Get your CloudFront domain from Terraform
2. ✅ Find your Route 53 hosted zone
3. ✅ Create the DNS record (A-Alias or CNAME)
4. ✅ Wait for propagation

---

## 📋 Manual Method (AWS Console)

### Step 1: Get Your CloudFront Domain

```powershell
# Get CloudFront domain
cd terraform
terraform output web_app_cloudfront_url
```

**Example output:**
```
https://d3pduuz5pmf7gl.cloudfront.net
```

**Save this domain:** `d3pduuz5pmf7gl.cloudfront.net` (without https://)

---

### Step 2: Open Route 53 Console

1. Go to: https://console.aws.amazon.com/route53/v2/home
2. Click **"Hosted zones"** in left sidebar
3. Click on your domain: **darptech.com**

---

### Step 3: Create DNS Record

#### For Root Domain (darptech.com):

1. Click **"Create record"**
2. Choose **"Simple routing"** → **"Next"**
3. Click **"Define simple record"**
4. Configure:
   ```
   Record name:     [leave blank for root domain]
   Record type:     A - Routes traffic to IPv4 address
   Value/Route:     [Choose "Alias to CloudFront distribution"]
   ```
5. In the dropdown, select your CloudFront distribution
6. Click **"Define simple record"**
7. Click **"Create records"**

#### For Subdomain (app.darptech.com):

1. Click **"Create record"**
2. Configure:
   ```
   Record name:     app
   Record type:     CNAME
   Value:           d3pduuz5pmf7gl.cloudfront.net
   TTL:             300 (5 minutes)
   ```
3. Click **"Create records"**

---

### Step 4: Verify DNS Record

Wait 5-10 minutes, then test:

```powershell
# Check DNS resolution
nslookup darptech.com

# Or use dig
dig darptech.com

# Test in browser
# Open: https://darptech.com
```

---

## 🎯 Quick Reference

### Root Domain (Apex) Setup

| Field | Value |
|-------|-------|
| **Record name** | (blank) |
| **Record type** | A - Alias |
| **Route traffic to** | CloudFront distribution |
| **Distribution** | Select your distribution |

### Subdomain Setup

| Field | Value |
|-------|-------|
| **Record name** | app |
| **Record type** | CNAME |
| **Value** | d3pduuz5pmf7gl.cloudfront.net |
| **TTL** | 300 |

---

## 🔧 Troubleshooting

### "Hosted zone not found"

**Check available zones:**
```powershell
aws route53 list-hosted-zones
```

**Create hosted zone:**
```powershell
aws route53 create-hosted-zone \
  --name darptech.com \
  --caller-reference $(date +%s)
```

### DNS not resolving

**Check propagation:**
```powershell
# Check DNS globally
nslookup darptech.com 8.8.8.8

# Or use online tool
# Visit: https://www.whatsmydns.net/
```

**Wait time:** 5-10 minutes (sometimes up to 24 hours)

### CloudFront error after DNS works

**Cause:** Domain not added to CloudFront alternate names

**Solution:** Make sure you updated `terraform/main.tf`:
```hcl
module "web_hosting" {
  # ...
  custom_domain = "darptech.com"
  acm_certificate_arn = "arn:aws:acm:..."
}
```

Then run:
```bash
terraform apply
```

---

## 📊 Visual Flow

```
Your Domain (darptech.com)
        |
        | DNS Resolution
        ↓
CloudFront Distribution (d3pduuz5pmf7gl.cloudfront.net)
        |
        | HTTPS/SSL
        ↓
S3 Bucket (onewordaday-web-prod)
        |
        ↓
Your Web App 🎉
```

---

## ⚡ Complete Setup Commands

```powershell
# 1. Get CloudFront domain
cd terraform
terraform output web_app_cloudfront_url

# 2. Add DNS record (automated)
cd ..
.\scripts\add-dns-record.ps1 -DomainName "darptech.com"

# 3. Wait 5-10 minutes

# 4. Test
curl -I https://darptech.com

# 5. Open in browser
start https://darptech.com
```

---

## 🎓 Understanding Record Types

### A Record (Alias for CloudFront)
- ✅ Works for root domain (darptech.com)
- ✅ No additional charges
- ✅ Automatic IP updates
- ✅ AWS Shield protection

### CNAME Record
- ✅ Works for subdomains (app.darptech.com)
- ❌ Cannot be used for root domain
- ✅ Points to another domain name

---

## 🔒 SSL Certificate Note

Your custom domain MUST have an SSL certificate in CloudFront.

If you get SSL errors:
1. Request certificate (see `SECURE_DOMAIN_SETUP.md`)
2. Validate via DNS
3. Update Terraform with certificate ARN
4. Run `terraform apply`

---

## ✅ Verification Checklist

After adding DNS record:

- [ ] DNS resolves: `nslookup darptech.com`
- [ ] Points to CloudFront: Check output includes `cloudfront.net`
- [ ] HTTPS works: Visit `https://darptech.com`
- [ ] SSL certificate valid: Check for 🔒 in browser
- [ ] Content loads: Your app appears correctly

---

## 📚 Additional Resources

- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [CloudFront Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [DNS Propagation Checker](https://www.whatsmydns.net/)

---

## 🎉 Success!

Once DNS propagates, your domain will be live:

**Before:** `https://d3pduuz5pmf7gl.cloudfront.net`

**After:** `https://darptech.com` 🚀

Enjoy your secure, custom domain web app!

