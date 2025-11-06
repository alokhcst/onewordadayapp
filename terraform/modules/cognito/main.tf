# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.name_prefix}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                     = "age_group"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                     = "context"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  schema {
    name                     = "exam_prep"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    string_attribute_constraints {
      min_length = 0
      max_length = 50
    }
  }

  tags = {
    Name = "${var.name_prefix}-user-pool"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.name_prefix}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false
  
  depends_on = [aws_cognito_identity_provider.google]

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  supported_identity_providers = var.google_client_id != "" ? ["GOOGLE"] : ["COGNITO"]

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  callback_urls = [
    "onewordadayapp://",
    "exp://localhost:8081"
  ]

  logout_urls = [
    "onewordadayapp://logout"
  ]

  read_attributes = [
    "email",
    "name"
  ]

  refresh_token_validity = 30
  access_token_validity  = 1
  id_token_validity      = 1

  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }
}

# Cognito Identity Provider (Google) - Optional
resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != "" ? 1 : 0
  
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email profile openid"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# Cognito Identity Pool
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.name_prefix}-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

# IAM Roles for Identity Pool
resource "aws_iam_role" "authenticated" {
  name = "${var.name_prefix}-cognito-authenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "authenticated" {
  name = "${var.name_prefix}-authenticated-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "google_client_id" {
  type        = string
  default     = ""
  description = "Google OAuth Client ID (optional)"
}

variable "google_client_secret" {
  type        = string
  default     = ""
  description = "Google OAuth Client Secret (optional)"
  sensitive   = true
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}

output "client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "identity_pool_id" {
  value = aws_cognito_identity_pool.main.id
}

