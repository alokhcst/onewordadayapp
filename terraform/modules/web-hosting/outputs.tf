output "s3_bucket_name" {
  description = "S3 bucket name for web hosting"
  value       = aws_s3_bucket.web_app.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.web_app.arn
}

output "s3_website_endpoint" {
  description = "S3 website endpoint"
  value       = aws_s3_bucket_website_configuration.web_app.website_endpoint
}

output "s3_website_url" {
  description = "S3 website URL"
  value       = "http://${aws_s3_bucket_website_configuration.web_app.website_endpoint}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.web_app.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.web_app.domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.web_app.domain_name}"
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.web_app.arn
}

output "custom_domain" {
  description = "Custom domain name (if configured)"
  value       = var.custom_domain
}

