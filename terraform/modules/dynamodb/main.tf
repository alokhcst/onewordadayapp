# Users Table
resource "aws_dynamodb_table" "users" {
  name           = "${var.name_prefix}-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.name_prefix}-users-table"
  }
}

# Daily Words Table
resource "aws_dynamodb_table" "daily_words" {
  name           = "${var.name_prefix}-daily-words"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "date"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  global_secondary_index {
    name            = "DateIndex"
    hash_key        = "date"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${var.name_prefix}-daily-words-table"
  }
}

# Word Bank Table
resource "aws_dynamodb_table" "word_bank" {
  name           = "${var.name_prefix}-word-bank"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "wordId"

  attribute {
    name = "wordId"
    type = "S"
  }

  attribute {
    name = "difficulty"
    type = "N"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "DifficultyIndex"
    hash_key        = "difficulty"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CategoryIndex"
    hash_key        = "category"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.name_prefix}-word-bank-table"
  }
}

# Feedback Table
resource "aws_dynamodb_table" "feedback" {
  name           = "${var.name_prefix}-feedback"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "feedbackId"
  range_key      = "userId"

  attribute {
    name = "feedbackId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  global_secondary_index {
    name            = "UserDateIndex"
    hash_key        = "userId"
    range_key       = "date"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.name_prefix}-feedback-table"
  }
}

# Notification Logs Table
resource "aws_dynamodb_table" "notification_logs" {
  name           = "${var.name_prefix}-notification-logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "logId"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${var.name_prefix}-notification-logs-table"
  }
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "daily_words_table_name" {
  value = aws_dynamodb_table.daily_words.name
}

output "daily_words_table_arn" {
  value = aws_dynamodb_table.daily_words.arn
}

output "word_bank_table_name" {
  value = aws_dynamodb_table.word_bank.name
}

output "word_bank_table_arn" {
  value = aws_dynamodb_table.word_bank.arn
}

output "feedback_table_name" {
  value = aws_dynamodb_table.feedback.name
}

output "feedback_table_arn" {
  value = aws_dynamodb_table.feedback.arn
}

output "notification_logs_table_name" {
  value = aws_dynamodb_table.notification_logs.name
}

output "notification_logs_table_arn" {
  value = aws_dynamodb_table.notification_logs.arn
}

