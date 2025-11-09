# IAM Role for Lambda
resource "aws_iam_role" "lambda" {
  name = "${var.name_prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "lambda" {
  name = "${var.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.users_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.users_table_name}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.daily_words_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.daily_words_table_name}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.word_bank_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.word_bank_table_name}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.feedback_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.feedback_table_name}/index/*",
          "arn:aws:dynamodb:*:*:table/${var.notification_logs_table_name}",
          "arn:aws:dynamodb:*:*:table/${var.notification_logs_table_name}/index/*",
          "arn:aws:dynamodb:*:*:table/onewordaday-*",
          "arn:aws:dynamodb:*:*:table/onewordaday-*/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.audio_bucket_name}/*",
          "arn:aws:s3:::${var.images_bucket_name}/*",
          "arn:aws:s3:::${var.user_content_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.llm_api_keys_secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:*:*:function:${var.name_prefix}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda Layer for common dependencies
resource "aws_lambda_layer_version" "dependencies" {
  filename            = "${path.module}/../../../backend/layers/dependencies.zip"
  layer_name          = "${var.name_prefix}-dependencies"
  compatible_runtimes = ["nodejs18.x"]
  source_code_hash    = fileexists("${path.module}/../../../backend/layers/dependencies.zip") ? filebase64sha256("${path.module}/../../../backend/layers/dependencies.zip") : null

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Word Generation Function
resource "aws_lambda_function" "word_generation" {
  filename         = "${path.module}/../../../backend/dist/word-generation.zip"
  function_name    = "${var.name_prefix}-word-generation"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/word-generation.zip") ? filebase64sha256("${path.module}/../../../backend/dist/word-generation.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 300
  memory_size      = 512

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE            = var.users_table_name
      DAILY_WORDS_TABLE      = var.daily_words_table_name
      WORD_BANK_TABLE        = var.word_bank_table_name
      AI_WORD_GEN_FUNCTION   = "${var.name_prefix}-ai-word-generation"
      USE_AI_GENERATION      = var.use_ai_generation
      ENVIRONMENT            = var.environment
      # AWS_REGION is automatically provided by Lambda runtime
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# AI Word Generation Function
resource "aws_lambda_function" "ai_word_generation" {
  filename         = "${path.module}/../../../backend/dist/ai-word-generation.zip"
  function_name    = "${var.name_prefix}-ai-word-generation"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/ai-word-generation.zip") ? filebase64sha256("${path.module}/../../../backend/dist/ai-word-generation.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 512

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE       = var.users_table_name
      DAILY_WORDS_TABLE = var.daily_words_table_name
      AI_USAGE_TABLE    = var.ai_usage_table_name
      SECRET_NAME       = var.llm_api_keys_secret_name
      ENVIRONMENT       = var.environment
      # AWS_REGION is automatically provided by Lambda runtime
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Content Enrichment Function
resource "aws_lambda_function" "content_enrichment" {
  filename         = "${path.module}/../../../backend/dist/content-enrichment.zip"
  function_name    = "${var.name_prefix}-content-enrichment"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/content-enrichment.zip") ? filebase64sha256("${path.module}/../../../backend/dist/content-enrichment.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 300
  memory_size      = 512

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      WORD_BANK_TABLE = var.word_bank_table_name
      AUDIO_BUCKET    = var.audio_bucket_name
      IMAGES_BUCKET   = var.images_bucket_name
      ENVIRONMENT     = var.environment
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Notification Dispatcher Function
resource "aws_lambda_function" "notification_dispatcher" {
  filename         = "${path.module}/../../../backend/dist/notification-dispatcher.zip"
  function_name    = "${var.name_prefix}-notification-dispatcher"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/notification-dispatcher.zip") ? filebase64sha256("${path.module}/../../../backend/dist/notification-dispatcher.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 256

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE               = var.users_table_name
      DAILY_WORDS_TABLE         = var.daily_words_table_name
      NOTIFICATION_LOGS_TABLE   = var.notification_logs_table_name
      ENVIRONMENT               = var.environment
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Feedback Processor Function
resource "aws_lambda_function" "feedback_processor" {
  filename         = "${path.module}/../../../backend/dist/feedback-processor.zip"
  function_name    = "${var.name_prefix}-feedback-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/feedback-processor.zip") ? filebase64sha256("${path.module}/../../../backend/dist/feedback-processor.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 256

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE        = var.users_table_name
      FEEDBACK_TABLE     = var.feedback_table_name
      DAILY_WORDS_TABLE  = var.daily_words_table_name
      ENVIRONMENT        = var.environment
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# User Preferences Function
resource "aws_lambda_function" "user_preferences" {
  filename         = "${path.module}/../../../backend/dist/user-preferences.zip"
  function_name    = "${var.name_prefix}-user-preferences"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/user-preferences.zip") ? filebase64sha256("${path.module}/../../../backend/dist/user-preferences.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE = var.users_table_name
      ENVIRONMENT = var.environment
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Get Today's Word Function
resource "aws_lambda_function" "get_todays_word" {
  filename         = "${path.module}/../../../backend/dist/get-todays-word.zip"
  function_name    = "${var.name_prefix}-get-todays-word"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/get-todays-word.zip") ? filebase64sha256("${path.module}/../../../backend/dist/get-todays-word.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 512

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      USERS_TABLE        = var.users_table_name
      DAILY_WORDS_TABLE  = var.daily_words_table_name
      WORD_BANK_TABLE    = var.word_bank_table_name
      ENVIRONMENT        = var.environment
      SECRET_NAME        = "onewordaday/llm-api-keys"
      USE_AI_GENERATION  = "true"
      # AWS_REGION is automatically provided by Lambda runtime
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Word History Function
resource "aws_lambda_function" "word_history" {
  filename         = "${path.module}/../../../backend/dist/word-history.zip"
  function_name    = "${var.name_prefix}-word-history"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = fileexists("${path.module}/../../../backend/dist/word-history.zip") ? filebase64sha256("${path.module}/../../../backend/dist/word-history.zip") : null
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  layers = [aws_lambda_layer_version.dependencies.arn]

  environment {
    variables = {
      DAILY_WORDS_TABLE = var.daily_words_table_name
      ENVIRONMENT       = var.environment
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "cognito_user_pool_id" {
  type = string
}

variable "users_table_name" {
  type = string
}

variable "daily_words_table_name" {
  type = string
}

variable "word_bank_table_name" {
  type = string
}

variable "feedback_table_name" {
  type = string
}

variable "notification_logs_table_name" {
  type = string
}

variable "audio_bucket_name" {
  type = string
}

variable "images_bucket_name" {
  type = string
}

variable "user_content_bucket_name" {
  type = string
}

variable "ai_usage_table_name" {
  type = string
}

variable "llm_api_keys_secret_arn" {
  type = string
}

variable "llm_api_keys_secret_name" {
  type = string
}

variable "use_ai_generation" {
  type    = string
  default = "false"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

output "lambda_functions" {
  value = {
    word_generation         = aws_lambda_function.word_generation
    ai_word_generation      = aws_lambda_function.ai_word_generation
    content_enrichment      = aws_lambda_function.content_enrichment
    notification_dispatcher = aws_lambda_function.notification_dispatcher
    feedback_processor      = aws_lambda_function.feedback_processor
    user_preferences        = aws_lambda_function.user_preferences
    get_todays_word         = aws_lambda_function.get_todays_word
    word_history            = aws_lambda_function.word_history
  }
}

output "word_generation_function_arn" {
  value = aws_lambda_function.word_generation.arn
}

output "notification_dispatcher_function_arn" {
  value = aws_lambda_function.notification_dispatcher.arn
}

