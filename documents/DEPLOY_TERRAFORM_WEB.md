# Deploy Web App with Terraform (S3 + CloudFront)

Complete guide to deploying your web app using Terraform with S3 and CloudFront.

## 🚀 Quick Start

```powershell
# 1. Deploy infrastructure with Terraform
cd terraform
terraform init
terraform plan
terraform apply

# 2. Build and deploy web app
cd ..
.\scripts\deploy-web.ps1 -UseTerraform

# Done! Your web app is live! 🎉
```

---

## 📋 What Gets Created

Terraform will automatically create:

### S3 Bucket
- ✅ Static website hosting enabled
- ✅ Public read access configured
- ✅ CORS enabled for API calls
- ✅ Proper error document for SPA routing

### CloudFront Distribution
- ✅ HTTPS enabled by default
- ✅ Global CDN with edge locations
- ✅ Compression enabled
- ✅ Custom error responses for SPA
- ✅ Cache optimization (long cache for assets, short for HTML)

### CloudWatch Logs
- ✅ Log group for monitoring
- ✅ 7-day retention (configurable)

---

## 📝 Step-by-Step Deployment

### Step 1: Review Terraform Configuration

The web hosting module is already added to `terraform/main.tf`:

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name              = var.project_name
  environment           = var.environment
  cloudfront_price_class = "PriceClass_100" # US, Canada, Europe
  log_retention_days    = 7
}
```

### Step 2: Initialize Terraform (if not already done)

```bash
cd terraform
terraform init
```

This downloads the required providers and sets up Terraform.

### Step 3: Review Changes

```bash
terraform plan
```

This shows what Terraform will create. You should see:
- `aws_s3_bucket.web_app`
- `aws_s3_bucket_website_configuration.web_app`
- `aws_cloudfront_distribution.web_app`
- And more...

### Step 4: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This takes **15-20 minutes** (CloudFront is slow to create).

### Step 5: Get Deployment URLs

After Terraform completes, it will show outputs:

```
Outputs:

web_app_s3_bucket = "onewordaday-web-dev"
web_app_s3_url = "http://onewordaday-web-dev.s3-website-us-east-1.amazonaws.com"
web_app_cloudfront_url = "https://d1234567890abc.cloudfront.net"
web_app_cloudfront_id = "E1234567890ABC"
```

Save the CloudFront URL - that's your production web app URL!

### Step 6: Build and Deploy Web App

```powershell
# From project root
.\scripts\deploy-web.ps1 -UseTerraform
```

This will:
1. Build your Expo web app
2. Get bucket name from Terraform
3. Upload all files to S3
4. Invalidate CloudFront cache

### Step 7: Test Your Web App

Open the CloudFront URL in your browser:
```
https://d1234567890abc.cloudfront.net
```

✅ Your app should load with HTTPS!

---

## ⚙️ Configuration Options

### Change CloudFront Coverage

Edit `terraform/main.tf`:

```hcl
module "web_hosting" {
  # ...
  cloudfront_price_class = "PriceClass_All"  # Worldwide
  # cloudfront_price_class = "PriceClass_200"  # US, Europe, Asia, Middle East
  # cloudfront_price_class = "PriceClass_100"  # US, Canada, Europe (cheapest)
}
```

### Change Log Retention

```hcl
module "web_hosting" {
  # ...
  log_retention_days = 30  # Keep logs for 30 days
}
```

### Add Custom Domain (Optional)

1. Get an SSL certificate from AWS Certificate Manager (ACM) in `us-east-1`:
   ```bash
   # Request certificate
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. Update `terraform/main.tf`:
   ```hcl
   module "web_hosting" {
     # ...
     acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/..."
     custom_domain       = "yourdomain.com"
   }
   ```

3. Apply changes:
   ```bash
   terraform apply
   ```

4. Update your DNS to point to CloudFront domain

---

## 🔄 Updating Your Web App

### Deploy New Version

```powershell
# Build and deploy
.\scripts\deploy-web.ps1 -UseTerraform

# Or skip build if you haven't changed code
.\scripts\deploy-web.ps1 -UseTerraform -SkipBuild
```

### Manual Upload

```bash
# Build
npx expo export --platform web

# Get bucket name from Terraform
cd terraform
$BUCKET=$(terraform output -raw web_app_s3_bucket)
cd ..

# Upload
aws s3 sync dist/ s3://$BUCKET/ --delete

# Invalidate cache
$CFID=$(cd terraform && terraform output -raw web_app_cloudfront_id)
aws cloudfront create-invalidation --distribution-id $CFID --paths "/*"
```

---

## 📊 Monitoring

### View Metrics

```bash
# S3 metrics
aws s3 ls s3://$(cd terraform && terraform output -raw web_app_s3_bucket)/ --recursive --summarize

# CloudFront metrics - Go to AWS Console
# CloudFront > Distributions > [Your Distribution] > Monitoring
```

### View Logs

```bash
# Get log group name
cd terraform
terraform output

# View logs
aws logs tail /aws/cloudfront/onewordaday-web --follow
```

---

## 💰 Cost Breakdown

Based on your Terraform deployment:

### CloudFront (PriceClass_100)
- **Requests:** $0.0075/10,000 HTTP/HTTPS requests
- **Data Transfer:** First 1TB/month free (AWS Free Tier), then $0.085/GB
- **Estimated:** $1-2/month (10,000-50,000 requests)

### S3
- **Storage:** $0.023/GB/month (first 50GB)
- **Requests:** $0.0004/1,000 GET requests
- **Estimated:** $0.05-0.20/month

### CloudWatch Logs
- **Ingestion:** $0.50/GB
- **Storage:** $0.03/GB/month
- **Estimated:** $0.05-0.10/month

**Total: ~$1-3/month** for typical usage

---

## 🧹 Cleanup (Destroy Infrastructure)

To remove all web hosting resources:

```bash
cd terraform

# Preview what will be destroyed
terraform destroy -target=module.web_hosting

# Destroy the web hosting module
terraform destroy -target=module.web_hosting

# Or destroy everything
terraform destroy
```

⚠️ **Warning:** This deletes your S3 bucket and CloudFront distribution permanently!

---

## 🐛 Troubleshooting

### "Bucket already exists"

Someone else has that bucket name. Change your project name in `terraform.tfvars`:

```hcl
project_name = "onewordaday-yourname"
```

### CloudFront takes forever

CloudFront distributions take 15-20 minutes to create. Be patient! ☕

Check status:
```bash
aws cloudfront list-distributions --query "DistributionList.Items[0].Status"
```

### Web app not loading

1. **Check if build succeeded:**
   ```bash
   ls -la dist/
   ```

2. **Check S3 upload:**
   ```bash
   aws s3 ls s3://$(cd terraform && terraform output -raw web_app_s3_bucket)/
   ```

3. **Check CloudFront status:**
   ```bash
   terraform output web_app_cloudfront_url
   # Open in browser
   ```

### API calls failing (CORS errors)

Make sure your API Gateway has CORS enabled (already configured in your Terraform).

Update `.env.production` with correct API URL:
```env
EXPO_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

### Cache not updating

Invalidate CloudFront cache:
```powershell
.\scripts\deploy-web.ps1 -UseTerraform -SkipBuild
```

---

## 🎯 Best Practices

### 1. Use Terraform for Infrastructure

✅ DO: Use Terraform to manage S3 and CloudFront
❌ DON'T: Manually create resources in AWS Console

### 2. Separate Build and Deploy

```powershell
# Build once
npx expo export --platform web

# Deploy multiple times (fast)
.\scripts\deploy-web.ps1 -UseTerraform -SkipBuild
```

### 3. Always Invalidate Cache

After deploying, always invalidate:
```bash
aws cloudfront create-invalidation \
  --distribution-id $(cd terraform && terraform output -raw web_app_cloudfront_id) \
  --paths "/*"
```

### 4. Use Environment Variables

```env
# .env.production
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/prod
EXPO_PUBLIC_ENV=production
```

### 5. Monitor Your Costs

Check AWS Cost Explorer regularly:
```
AWS Console > Cost Management > Cost Explorer
```

---

## 📚 Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)

---

## ✨ You're Done!

Your web app is now deployed with:
- ✅ Global CDN (CloudFront)
- ✅ HTTPS enabled
- ✅ Automatic compression
- ✅ Optimized caching
- ✅ SPA routing support
- ✅ Infrastructure as Code

Access your app at: **https://[your-cloudfront-domain].cloudfront.net**

🎉 Happy deploying!

