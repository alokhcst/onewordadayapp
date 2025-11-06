# SNS Topic for Push Notifications
resource "aws_sns_topic" "push_notifications" {
  name = "${var.name_prefix}-push-notifications"

  tags = {
    Name = "${var.name_prefix}-push-notifications"
  }
}

# SNS Topic for Email Notifications
resource "aws_sns_topic" "email_notifications" {
  name = "${var.name_prefix}-email-notifications"

  tags = {
    Name = "${var.name_prefix}-email-notifications"
  }
}

# SNS Topic for SMS Notifications
resource "aws_sns_topic" "sms_notifications" {
  name = "${var.name_prefix}-sms-notifications"

  tags = {
    Name = "${var.name_prefix}-sms-notifications"
  }
}

# SNS Topic Policy
resource "aws_sns_topic_policy" "push_notifications" {
  arn = aws_sns_topic.push_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.push_notifications.arn
      }
    ]
  })
}

# SES Email Identity (requires verification)
resource "aws_ses_email_identity" "noreply" {
  email = var.ses_sender_email
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  name = "${var.name_prefix}-ses-config"
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "ses_sender_email" {
  type        = string
  description = "Email address for SES sender identity"
}

output "push_notifications_topic_arn" {
  value = aws_sns_topic.push_notifications.arn
}

output "email_notifications_topic_arn" {
  value = aws_sns_topic.email_notifications.arn
}

output "sms_notifications_topic_arn" {
  value = aws_sns_topic.sms_notifications.arn
}

