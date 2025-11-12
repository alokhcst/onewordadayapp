variable "app_name" {
  description = "Application name"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (optional)"
  type        = string
  default     = ""
}

variable "custom_domain" {
  description = "Custom domain name for the web app (optional)"
  type        = string
  default     = ""
}

