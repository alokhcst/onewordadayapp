terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "OneWordADay"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "onewordaday"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ses_sender_email" {
  description = "SES Sender Email Address"
  type        = string
  default     = "noreply@yourdomain.com"
}

variable "use_ai_generation" {
  description = "Enable AI-based word generation (true/false)"
  type        = string
  default     = "false"
}

# Locals
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# Modules
module "cognito" {
  source = "./modules/cognito"
  
  name_prefix           = local.name_prefix
  environment           = var.environment
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
}

module "dynamodb" {
  source = "./modules/dynamodb"
  
  name_prefix = local.name_prefix
  environment = var.environment
}

module "secrets" {
  source = "./modules/secrets"
  
  name_prefix = local.name_prefix
}

module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  environment = var.environment
}

module "lambda" {
  source = "./modules/lambda"
  
  name_prefix           = local.name_prefix
  environment           = var.environment
  cognito_user_pool_id  = module.cognito.user_pool_id
  users_table_name      = module.dynamodb.users_table_name
  daily_words_table_name = module.dynamodb.daily_words_table_name
  word_bank_table_name  = module.dynamodb.word_bank_table_name
  feedback_table_name   = module.dynamodb.feedback_table_name
  notification_logs_table_name = module.dynamodb.notification_logs_table_name
  ai_usage_table_name   = module.dynamodb.ai_usage_table_name
  audio_bucket_name     = module.s3.audio_bucket_name
  images_bucket_name    = module.s3.images_bucket_name
  user_content_bucket_name = module.s3.user_content_bucket_name
  llm_api_keys_secret_arn = module.secrets.llm_api_keys_secret_arn
  llm_api_keys_secret_name = module.secrets.llm_api_keys_secret_name
  use_ai_generation     = var.use_ai_generation
  aws_region            = var.aws_region
}

module "api_gateway" {
  source = "./modules/api_gateway"
  
  name_prefix           = local.name_prefix
  environment           = var.environment
  cognito_user_pool_arn = module.cognito.user_pool_arn
  lambda_functions      = module.lambda.lambda_functions
}

module "sns" {
  source = "./modules/sns"
  
  name_prefix      = local.name_prefix
  environment      = var.environment
  ses_sender_email = var.ses_sender_email
}

module "eventbridge" {
  source = "./modules/eventbridge"
  
  name_prefix                     = local.name_prefix
  environment                     = var.environment
  word_generation_function_arn    = module.lambda.word_generation_function_arn
  notification_dispatcher_function_arn = module.lambda.notification_dispatcher_function_arn
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
  
  name_prefix = local.name_prefix
  environment = var.environment
}

# Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = module.cognito.client_id
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.api_gateway.api_url
}

output "cloudfront_domain" {
  description = "CloudFront Distribution Domain"
  value       = module.s3.cloudfront_domain
}

