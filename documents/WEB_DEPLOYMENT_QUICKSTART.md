# Web Deployment Quick Start Guide

Deploy your One Word A Day app as a web application on AWS in minutes!

## 🚀 Quick Deploy (Easiest)

### Option 1: Using the Deployment Script

```powershell
# 1. Build and deploy in one command
.\scripts\deploy-web.ps1

# That's it! Your web app is live! 🎉
```

The script will:
- ✅ Build your Expo web app
- ✅ Create S3 bucket (if needed)
- ✅ Upload files to S3
- ✅ Invalidate CloudFront cache (if exists)

**Access your app at:** `http://onewordaday-web.s3-website-us-east-1.amazonaws.com`

---

## 📋 Prerequisites

Before deploying, make sure you have:

1. **AWS CLI installed and configured:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Default region: us-east-1
   ```

2. **Node.js and npm installed**

3. **Expo CLI installed** (optional, but helpful):
   ```bash
   npm install -g expo-cli
   ```

---

## 🏗️ Option 2: Manual Deployment

### Step 1: Build Web App

```bash
npx expo export --platform web
```

This creates a `dist/` folder with your production-ready web app.

### Step 2: Create S3 Bucket

```bash
aws s3 mb s3://onewordaday-web --region us-east-1

# Enable static website hosting
aws s3 website s3://onewordaday-web \
  --index-document index.html \
  --error-document index.html
```

### Step 3: Upload Files

```bash
# Upload everything
aws s3 sync dist/ s3://onewordaday-web/ --delete
```

### Step 4: Make Bucket Public

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::onewordaday-web/*"
    }
  ]
}
```

Apply policy:

```bash
aws s3api put-bucket-policy \
  --bucket onewordaday-web \
  --policy file://bucket-policy.json
```

### Step 5: Access Your Web App

Your app is now live at:
```
http://onewordaday-web.s3-website-us-east-1.amazonaws.com
```

---

## 🚀 Option 3: Terraform (Infrastructure as Code)

Coming soon! Add the web hosting module to your existing Terraform setup.

```bash
cd terraform
terraform apply
```

---

## ⚙️ Configuration

### Update API Endpoint

Make sure your web app knows where to find the backend API.

Create `.env.production`:

```env
EXPO_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/prod
EXPO_PUBLIC_ENV=production
```

Or update in your code:

```typescript
// lib/api.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';
```

---

## 🎨 Add CloudFront CDN (Recommended)

For better performance and HTTPS support:

### Quick CloudFront Setup

```bash
# Create distribution (this takes 15-20 minutes)
aws cloudfront create-distribution \
  --origin-domain-name onewordaday-web.s3.amazonaws.com \
  --default-root-object index.html
```

Or use the provided Terraform module (see `terraform/modules/web-hosting/`).

**Benefits of CloudFront:**
- ✅ HTTPS support
- ✅ Global CDN (faster loading worldwide)
- ✅ Custom domains
- ✅ Better caching

---

## 🔄 Update Deployment

To deploy updates:

```powershell
# Rebuild and redeploy
.\scripts\deploy-web.ps1
```

Or manually:

```bash
# Build
npx expo export --platform web

# Upload
aws s3 sync dist/ s3://onewordaday-web/ --delete

# Invalidate CloudFront cache (if using CloudFront)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 🧪 Test Locally First

Before deploying, test the web build locally:

```bash
# Build
npx expo export --platform web

# Serve locally (requires npx serve)
npx serve dist

# Open http://localhost:3000 in your browser
```

---

## 📊 Monitoring

### View S3 Metrics

```bash
# Check bucket size
aws s3 ls s3://onewordaday-web --recursive --human-readable --summarize
```

### View CloudFront Metrics

Go to: AWS Console → CloudFront → Your Distribution → Monitoring

---

## 💰 Cost Estimate

### S3 + Website Hosting
- **Storage:** $0.023/GB/month
- **Requests:** $0.0004/1000 requests
- **Data Transfer Out:** First 100GB free, then $0.09/GB

**Example:** For 1GB storage + 10,000 requests/month = ~$0.05/month

### With CloudFront
- **Requests:** $0.0075/10,000 requests
- **Data Transfer:** First 1TB free (AWS Free Tier), then $0.085/GB

**Example:** Light traffic = ~$1-2/month

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf dist/
rm -rf node_modules/.cache/
npx expo export --platform web
```

### Upload Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check bucket exists
aws s3 ls s3://onewordaday-web
```

### Routes Don't Work (404 on refresh)

This is fixed by setting `error-document` to `index.html` (already done in setup).

If using CloudFront, add custom error responses (see full deployment guide).

### API Calls Fail (CORS)

Make sure:
1. API Gateway has CORS enabled (already done in Terraform)
2. API URL is correct in `.env.production`

---

## 🎯 Next Steps

1. ✅ Deploy web app
2. 🔜 Add CloudFront for HTTPS
3. 🔜 Configure custom domain
4. 🔜 Set up SSL certificate (AWS Certificate Manager)
5. 🔜 Add CI/CD with GitHub Actions

---

## 📚 Additional Resources

- [Full Deployment Guide](./DEPLOYMENT_WEB_AWS.md) - Detailed instructions
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

---

## ✨ Success!

Your web app should now be live! 🎉

Test it by visiting your S3 website URL or CloudFront URL in a browser.

For help, see the [troubleshooting section](#-troubleshooting) or check the full deployment guide.

Happy deploying! 🚀

