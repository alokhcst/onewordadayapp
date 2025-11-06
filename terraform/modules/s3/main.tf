# S3 Bucket for Audio Files
resource "aws_s3_bucket" "audio" {
  bucket = "${var.name_prefix}-audio-files"

  tags = {
    Name = "${var.name_prefix}-audio-bucket"
  }
}

resource "aws_s3_bucket_versioning" "audio" {
  bucket = aws_s3_bucket.audio.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket = aws_s3_bucket.audio.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Images
resource "aws_s3_bucket" "images" {
  bucket = "${var.name_prefix}-images"

  tags = {
    Name = "${var.name_prefix}-images-bucket"
  }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_intelligent_tiering_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  name   = "EntireBucket"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

# S3 Bucket for User Content
resource "aws_s3_bucket" "user_content" {
  bucket = "${var.name_prefix}-user-content"

  tags = {
    Name = "${var.name_prefix}-user-content-bucket"
  }
}

resource "aws_s3_bucket_versioning" "user_content" {
  bucket = aws_s3_bucket.user_content.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_content" {
  bucket = aws_s3_bucket.user_content.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "user_content" {
  bucket = aws_s3_bucket.user_content.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "${var.name_prefix} CloudFront OAI"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.name_prefix} media distribution"
  default_root_object = ""
  price_class         = "PriceClass_100"

  # Audio files origin
  origin {
    domain_name = aws_s3_bucket.audio.bucket_regional_domain_name
    origin_id   = "S3-audio"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Images origin
  origin {
    domain_name = aws_s3_bucket.images.bucket_regional_domain_name
    origin_id   = "S3-images"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-audio"

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

  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-images"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
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
    Name = "${var.name_prefix}-cloudfront"
  }
}

# S3 Bucket Policies for CloudFront
resource "aws_s3_bucket_policy" "audio" {
  bucket = aws_s3_bucket.audio.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontReadAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.audio.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "images" {
  bucket = aws_s3_bucket.images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontReadAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

output "audio_bucket_name" {
  value = aws_s3_bucket.audio.id
}

output "audio_bucket_arn" {
  value = aws_s3_bucket.audio.arn
}

output "images_bucket_name" {
  value = aws_s3_bucket.images.id
}

output "images_bucket_arn" {
  value = aws_s3_bucket.images.arn
}

output "user_content_bucket_name" {
  value = aws_s3_bucket.user_content.id
}

output "user_content_bucket_arn" {
  value = aws_s3_bucket.user_content.arn
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

