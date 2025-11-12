# Web Hosting Module (S3 + CloudFront)

Terraform module to deploy a static web application using S3 and CloudFront.

## Features

- ✅ S3 bucket with static website hosting
- ✅ CloudFront CDN with HTTPS
- ✅ Automatic compression (gzip/brotli)
- ✅ Optimized caching strategy
- ✅ SPA routing support (404 → index.html)
- ✅ CORS configuration
- ✅ CloudWatch logging

## Usage

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name               = "myapp"
  environment            = "prod"
  cloudfront_price_class = "PriceClass_100"
  log_retention_days     = 7
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `app_name` | Application name | string | - | yes |
| `environment` | Environment (dev/staging/prod) | string | - | yes |
| `cloudfront_price_class` | CloudFront price class | string | `"PriceClass_100"` | no |
| `log_retention_days` | CloudWatch log retention | number | `7` | no |
| `acm_certificate_arn` | ACM certificate ARN (for custom domain) | string | `""` | no |
| `custom_domain` | Custom domain name | string | `""` | no |

### CloudFront Price Classes

- `PriceClass_100`: US, Canada, Europe (cheapest)
- `PriceClass_200`: US, Europe, Asia, Middle East, Africa
- `PriceClass_All`: All edge locations (most expensive)

## Outputs

| Name | Description |
|------|-------------|
| `s3_bucket_name` | S3 bucket name |
| `s3_bucket_arn` | S3 bucket ARN |
| `s3_website_endpoint` | S3 website endpoint |
| `s3_website_url` | Full S3 website URL |
| `cloudfront_distribution_id` | CloudFront distribution ID |
| `cloudfront_domain_name` | CloudFront domain name |
| `cloudfront_url` | Full CloudFront URL (HTTPS) |
| `cloudfront_arn` | CloudFront distribution ARN |

## Example with Custom Domain

```hcl
module "web_hosting" {
  source = "./modules/web-hosting"
  
  app_name               = "myapp"
  environment            = "prod"
  cloudfront_price_class = "PriceClass_All"
  log_retention_days     = 30
  
  # Custom domain (requires ACM certificate)
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/..."
  custom_domain       = "www.myapp.com"
}
```

## Cache Behavior

- **Static assets** (`/static/*`): 1 year cache
- **HTML files**: No cache (always fresh)
- **Other files**: 1 hour cache

## SPA Routing

The module automatically configures custom error responses:
- 403 → 200 (returns index.html)
- 404 → 200 (returns index.html)

This ensures client-side routing works correctly.

## Cost Estimate

For light traffic (~10,000 requests/month):
- **S3 Storage**: $0.05-0.20/month
- **CloudFront (PriceClass_100)**: $1-2/month
- **CloudWatch Logs**: $0.05-0.10/month

**Total: ~$1-3/month**

## Deployment

1. Apply Terraform:
   ```bash
   terraform apply
   ```

2. Upload your web app:
   ```bash
   aws s3 sync dist/ s3://$(terraform output -raw s3_bucket_name)/ --delete
   ```

3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id $(terraform output -raw cloudfront_distribution_id) \
     --paths "/*"
   ```

Or use the provided deployment script:
```powershell
.\scripts\deploy-web.ps1 -UseTerraform
```

## Notes

- CloudFront distributions take 15-20 minutes to create
- S3 bucket names must be globally unique
- ACM certificates for CloudFront must be in `us-east-1` region
- First-time deployments require DNS propagation (can take up to 24 hours for custom domains)

