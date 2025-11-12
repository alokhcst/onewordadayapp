# S3 + CloudFront Web Hosting Module for Expo Web App

# S3 Bucket for Web Hosting
resource "aws_s3_bucket" "web_app" {
  bucket = "${var.app_name}-web-${var.environment}"
  
  tags = {
    Name        = "${var.app_name}-web"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# S3 Bucket Website Configuration
resource "aws_s3_bucket_website_configuration" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Policy for Public Read
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

  depends_on = [aws_s3_bucket_public_access_block.web_app]
}

# S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "web_app" {
  bucket = aws_s3_bucket.web_app.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# CloudFront Origin Access Identity (optional - for more security)
resource "aws_cloudfront_origin_access_identity" "web_app" {
  comment = "${var.app_name} web app OAI"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "web_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  comment             = "${var.app_name} web distribution"
  aliases             = var.custom_domain != "" ? [var.custom_domain] : []

  origin {
    domain_name = aws_s3_bucket.web_app.bucket_regional_domain_name
    origin_id   = "S3-${var.app_name}-web"

    # Optional: Use OAI for better security
    # s3_origin_config {
    #   origin_access_identity = aws_cloudfront_origin_access_identity.web_app.cloudfront_access_identity_path
    # }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.app_name}-web"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

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

  # Cache behavior for static assets (longer cache)
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.app_name}-web"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
    compress               = true
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = {
    Name        = "${var.app_name}-web-distribution"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# CloudWatch Log Group for monitoring (optional)
resource "aws_cloudwatch_log_group" "web_app" {
  name              = "/aws/cloudfront/${var.app_name}-web"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.app_name}-web-logs"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

