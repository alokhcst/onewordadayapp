# Deploying One Word A Day Web App to AWS

This guide covers deploying the Expo web build to AWS using different methods.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js and npm/yarn installed
- Expo CLI installed (`npm install -g expo-cli`)

---

## Option 1: S3 + CloudFront (Recommended)

Host static files on S3 with CloudFront CDN for global distribution.

### Step 1: Build for Web

```bash
# Export web build
npx expo export --platform web

# This creates a 'dist' folder
```

### Step 2: Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://onewordaday-web --region us-east-1

# Enable static website hosting
aws s3 website s3://onewordaday-web \
  --index-document index.html \
  --error-document index.html
```

### Step 3: Configure Bucket Policy

Create `s3-bucket-policy.json`:

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
  --policy file://s3-bucket-policy.json
```

### Step 4: Upload Build

```bash
# Sync dist folder to S3
aws s3 sync dist/ s3://onewordaday-web/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html separately (no cache)
aws s3 cp dist/index.html s3://onewordaday-web/index.html \
  --cache-control "public, max-age=0, must-revalidate"
```

### Step 5: Create CloudFront Distribution

Create `cloudfront-config.json`:

```json
{
  "CallerReference": "onewordaday-web-1",
  "Comment": "One Word A Day Web Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-onewordaday-web",
        "DomainName": "onewordaday-web.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-onewordaday-web",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Enabled": true
}
```

Create distribution:

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Step 6: Get CloudFront URL

```bash
# List distributions
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='One Word A Day Web Distribution'].DomainName" \
  --output text
```

Your web app will be available at: `https://d1234567890abc.cloudfront.net`

**Cost:** ~$0.50-2/month (depending on traffic)

---

## Option 2: Automated Deployment with Terraform

Add to your existing `terraform/main.tf`:

```hcl
# S3 Bucket for Web Hosting
resource "aws_s3_bucket" "web_app" {
  bucket = "${var.app_name}-web"
  
  tags = {
    Name        = "${var.app_name}-web"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_website_configuration" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.web_app.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "web_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.web_app.bucket_regional_domain_name
    origin_id   = "S3-${var.app_name}-web"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.app_name}-web"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.app_name}-web-distribution"
    Environment = var.environment
  }
}

output "web_app_url" {
  value       = "https://${aws_cloudfront_distribution.web_app.domain_name}"
  description = "CloudFront distribution URL for web app"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.web_app.id
  description = "S3 bucket name for web app"
}
```

Deploy:

```bash
cd terraform
terraform apply
```

---

## Deployment Script

Create `scripts/deploy-web.ps1`:

```powershell
#!/usr/bin/env pwsh
# Deploy web app to AWS

param(
    [string]$Environment = "prod",
    [string]$BucketName = "onewordaday-web",
    [switch]$SkipBuild
)

Write-Host "🚀 Deploying One Word A Day Web App to AWS" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build
if (!$SkipBuild) {
    Write-Host "[1/3] Building web app..." -ForegroundColor Cyan
    npx expo export --platform web
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build complete!" -ForegroundColor Green
} else {
    Write-Host "[1/3] Skipping build..." -ForegroundColor Yellow
}

# Step 2: Upload to S3
Write-Host ""
Write-Host "[2/3] Uploading to S3..." -ForegroundColor Cyan

# Upload assets with long cache
aws s3 sync dist/ s3://$BucketName/ `
    --delete `
    --cache-control "public, max-age=31536000, immutable" `
    --exclude "index.html" `
    --exclude "*.html"

# Upload HTML files with no cache
aws s3 sync dist/ s3://$BucketName/ `
    --cache-control "public, max-age=0, must-revalidate" `
    --exclude "*" `
    --include "*.html"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Upload complete!" -ForegroundColor Green

# Step 3: Invalidate CloudFront cache
Write-Host ""
Write-Host "[3/3] Invalidating CloudFront cache..." -ForegroundColor Cyan

$distributionId = aws cloudfront list-distributions `
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BucketName.s3.amazonaws.com'].Id" `
    --output text

if ($distributionId) {
    aws cloudfront create-invalidation `
        --distribution-id $distributionId `
        --paths "/*"
    
    Write-Host "✅ Cache invalidated!" -ForegroundColor Green
} else {
    Write-Host "⚠️  No CloudFront distribution found, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "Web app URL: https://$BucketName.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
```

Run deployment:

```powershell
.\scripts\deploy-web.ps1
```

---

## Environment Configuration

Update your web environment variables in `.env.production`:

```env
EXPO_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/prod
EXPO_PUBLIC_ENV=production
```

Or set as environment variables in your CI/CD pipeline (GitHub Actions, etc.).

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web to AWS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npx expo export --platform web
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://onewordaday-web/ \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "*.html"
          
          aws s3 sync dist/ s3://onewordaday-web/ \
            --cache-control "public, max-age=0, must-revalidate" \
            --exclude "*" \
            --include "*.html"
      
      - name: Invalidate CloudFront
        run: |
          DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Origins.Items[0].DomainName=='onewordaday-web.s3.amazonaws.com'].Id" \
            --output text)
          
          if [ ! -z "$DISTRIBUTION_ID" ]; then
            aws cloudfront create-invalidation \
              --distribution-id $DISTRIBUTION_ID \
              --paths "/*"
          fi
```

---

## Cost Estimates

### S3 + CloudFront
- **S3 storage:** $0.023/GB/month
- **S3 requests:** $0.0004/1000 GET requests
- **CloudFront transfer:** $0.085/GB (first 10TB, then cheaper)
- **CloudFront requests:** $0.0075/10,000 requests
- **Estimated:** $0.50-2/month (light traffic)

### S3 Only (No CloudFront)
- **S3 storage:** $0.023/GB/month  
- **Data transfer out:** First 100GB free, then $0.09/GB
- **Estimated:** $0.05-0.50/month (light traffic)

---

## Monitoring

### CloudWatch Metrics

Monitor your web app:
- CloudFront requests
- S3 bucket size
- Error rates

### Enable CloudFront Logging

```bash
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --logging-config Enabled=true,IncludeCookies=false,Bucket=onewordaday-logs.s3.amazonaws.com,Prefix=cloudfront/
```

---

## Troubleshooting

### Issue: Routes not working (404 on refresh)

**Solution:** Configure CloudFront custom error responses to redirect 404 to index.html (already included in config above).

### Issue: Old content showing after deployment

**Solution:** Invalidate CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Issue: CORS errors when calling API

**Solution:** Ensure API Gateway has CORS configured (already done in your Terraform).

---

## Next Steps

1. ✅ Deploy backend (already done via Terraform)
2. ✅ Build web app
3. ✅ Deploy to AWS
4. 🔜 Configure custom domain
5. 🔜 Set up SSL certificate (ACM)
6. 🔜 Configure CDN caching
7. 🔜 Set up monitoring and alerts

---

## Recommended: Complete Setup

For production deployment:

1. **Use Terraform** (Option 3) for infrastructure
2. **Use GitHub Actions** for CI/CD
3. **Add custom domain** with Route 53
4. **Enable SSL** with AWS Certificate Manager
5. **Set up monitoring** with CloudWatch

This gives you a fully automated, scalable web deployment! 🚀

