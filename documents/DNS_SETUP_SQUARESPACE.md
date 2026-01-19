# DNS Setup for Squarespace-Managed Domain

Guide to point your Squarespace domain (darptech.com) to your AWS CloudFront web app.

---

## ✅ You Don't Need Route 53!

Since your domain is managed by Squarespace, you can add DNS records directly in Squarespace's DNS settings.

---

## 📋 Step-by-Step Setup

### Step 1: Get Your CloudFront Domain

First, get your CloudFront distribution domain:

```powershell
cd terraform
terraform output web_app_cloudfront_url
```

**Example output:**
```
https://d3pduuz5pmf7gl.cloudfront.net
```

**Save the domain:** `d3pduuz5pmf7gl.cloudfront.net` (without https://)

---

### Step 2: Open Squarespace DNS Settings

1. Go to https://account.squarespace.com/
2. Click on your domain: **darptech.com**
3. Click **"DNS Settings"** (or **"Advanced Settings"** → **"Manage DNS"**)

---

### Step 3: Add CNAME Record

#### For Root Domain (darptech.com):

**Option A: Use Subdomain (Recommended)**

Squarespace doesn't allow CNAME on root domain with A records. Use a subdomain instead:

```
Host:    app
Type:    CNAME
Value:   d3pduuz5pmf7gl.cloudfront.net
TTL:     3600 (1 hour)
```

Your app will be at: **https://app.darptech.com**

**Option B: Use ALIAS (if available)**

Some DNS providers have ALIAS records for root domains. Check if Squarespace supports it:

```
Host:    @
Type:    ALIAS (if available)
Value:   d3pduuz5pmf7gl.cloudfront.net
```

Your app will be at: **https://darptech.com**

#### For Subdomain (app.darptech.com):

```
Host:    app
Type:    CNAME
Value:   d3pduuz5pmf7gl.cloudfront.net
TTL:     3600
```

---

### Step 4: Save and Wait

1. Click **"Add"** or **"Save"**
2. Wait **5-60 minutes** for DNS propagation
3. Test your domain

---

## 🧪 Testing Your Setup

### Check DNS Resolution

```powershell
# Check if DNS is working
nslookup app.darptech.com

# Should show CloudFront domain
# Or use online tool: https://www.whatsmydns.net/
```

### Test in Browser

```
https://app.darptech.com
```

---

## 🎯 Squarespace DNS Configuration

### Visual Guide

```
┌─────────────────────────────────────┐
│ Squarespace DNS Settings            │
├─────────────────────────────────────┤
│ Host:  app                          │
│ Type:  CNAME                        │
│ Value: d3pduuz5pmf7gl.cloudfront... │
│ TTL:   3600                         │
└─────────────────────────────────────┘
         ↓
    DNS Resolution
         ↓
┌─────────────────────────────────────┐
│ CloudFront (AWS)                    │
│ https://d3pduuz5pmf7gl.cloudfront...│
└─────────────────────────────────────┘
         ↓
      Your Web App 🎉
```

---

## ⚠️ Important Notes

### 1. Root Domain Limitation

**Problem:** Most DNS providers (including Squarespace) don't allow CNAME on root domain (darptech.com) if other records exist.

**Solutions:**
- ✅ **Use subdomain:** `app.darptech.com` (Recommended)
- ✅ **Use www:** `www.darptech.com`
- ❌ **Migrate to Route 53:** (Only if you need root domain)

### 2. SSL Certificate

Your custom domain needs an SSL certificate in CloudFront.

**If you get SSL errors:**
1. Request certificate in AWS Certificate Manager (us-east-1)
2. Validate via DNS (add records to Squarespace)
3. Update Terraform configuration
4. Run `terraform apply`

See: `SECURE_DOMAIN_SETUP.md` for details

### 3. Multiple Records

You can add multiple subdomains:

```
app.darptech.com  → Your web app
api.darptech.com  → Your API
www.darptech.com  → Redirect to app
```

---

## 🔧 Squarespace DNS Interface

### Where to Find DNS Settings

**Method 1: Direct Link**
1. Go to: https://account.squarespace.com/domains
2. Click your domain
3. Look for "DNS Settings" or "Advanced DNS"

**Method 2: From Dashboard**
1. Login to Squarespace
2. Settings → Domains
3. Click domain → DNS Settings

### Common Fields

| Field | What to Enter |
|-------|---------------|
| **Host** | Subdomain (e.g., `app`, `www`, or `@` for root) |
| **Type** | CNAME |
| **Points To / Value** | Your CloudFront domain |
| **TTL** | 3600 (1 hour) or 300 (5 min) |

---

## 🚀 Complete Setup Process

### Step-by-Step Commands

```powershell
# 1. Get your CloudFront domain
cd terraform
$cloudfront = terraform output -raw web_app_cloudfront_url
$cloudfront = $cloudfront -replace 'https://', ''
Write-Host "Add this to Squarespace DNS:"
Write-Host "  Host: app"
Write-Host "  Type: CNAME"
Write-Host "  Value: $cloudfront"

# 2. Update Terraform with custom domain (after SSL cert)
# Edit terraform/main.tf and add:
# custom_domain = "app.darptech.com"
# acm_certificate_arn = "arn:aws:acm:..."

# 3. Apply changes
terraform apply

# 4. Wait for DNS propagation (5-60 minutes)

# 5. Test
curl -I https://app.darptech.com
```

---

## 🔄 Alternative: Migrate to Route 53

If you want more control or need root domain support:

### Benefits of Route 53

- ✅ ALIAS records for root domain
- ✅ Better AWS integration
- ✅ Advanced routing policies
- ✅ Health checks

### Migration Steps

1. **Create hosted zone in Route 53:**
   ```bash
   aws route53 create-hosted-zone \
     --name darptech.com \
     --caller-reference $(date +%s)
   ```

2. **Get Route 53 nameservers:**
   ```bash
   aws route53 get-hosted-zone --id [ZONE-ID] \
     --query "DelegationSet.NameServers"
   ```

3. **Update nameservers in Squarespace:**
   - Go to Squarespace domain settings
   - Change nameservers to Route 53 nameservers
   - Wait 24-48 hours for propagation

4. **Use Route 53 scripts:**
   ```powershell
   .\scripts\add-dns-record.ps1 -DomainName "darptech.com"
   ```

**Cost:** ~$0.50/month for hosted zone

---

## 🎓 Recommended Setup

For your situation, I recommend:

### Option 1: Subdomain (Easiest - No Migration)

```
https://app.darptech.com → Your web app
https://darptech.com      → Your Squarespace site (if any)
```

**Steps:**
1. Add CNAME in Squarespace: `app` → CloudFront domain
2. Request SSL certificate for `app.darptech.com`
3. Update Terraform and apply
4. Done! ✅

### Option 2: Root Domain (Requires Route 53)

```
https://darptech.com     → Your web app
https://www.darptech.com → Redirect to root
```

**Steps:**
1. Migrate DNS to Route 53
2. Use ALIAS record for root domain
3. Request SSL certificate for `darptech.com`
4. Update Terraform and apply
5. Done! ✅

---

## 💡 My Recommendation

**Use `app.darptech.com` (subdomain):**

**Pros:**
- ✅ No DNS migration needed
- ✅ Works immediately
- ✅ Keep Squarespace for main site
- ✅ Professional subdomain

**Cons:**
- ❌ Not root domain (minor)

---

## 📚 Resources

- [Squarespace DNS Documentation](https://support.squarespace.com/hc/en-us/articles/360002101888)
- [CloudFront Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [DNS Propagation Checker](https://www.whatsmydns.net/)

---

## ✅ Quick Checklist

For `app.darptech.com` setup:

- [ ] Get CloudFront domain from Terraform
- [ ] Add CNAME in Squarespace: `app` → CloudFront
- [ ] Request SSL certificate in AWS (us-east-1)
- [ ] Add DNS validation records to Squarespace
- [ ] Wait for certificate validation
- [ ] Update Terraform with certificate ARN and domain
- [ ] Run `terraform apply`
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Test: `https://app.darptech.com`

---

## 🎉 Success!

Once everything is set up:

**Your secure web app:** `https://app.darptech.com` 🚀🔒

No Route 53 needed!

