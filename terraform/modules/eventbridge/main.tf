# EventBridge Rule for Daily Word Generation
resource "aws_cloudwatch_event_rule" "daily_word_generation" {
  name                = "${var.name_prefix}-daily-word-generation"
  description         = "Trigger daily word generation at midnight UTC"
  schedule_expression = "cron(0 0 * * ? *)"  # Daily at 00:00 UTC

  tags = {
    Name = "${var.name_prefix}-daily-word-generation"
  }
}

resource "aws_cloudwatch_event_target" "word_generation" {
  rule      = aws_cloudwatch_event_rule.daily_word_generation.name
  target_id = "WordGenerationLambda"
  arn       = var.word_generation_function_arn
}

resource "aws_lambda_permission" "allow_eventbridge_word_generation" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.word_generation_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_word_generation.arn
}

# EventBridge Rule for Notification Dispatcher
resource "aws_cloudwatch_event_rule" "notification_dispatcher" {
  name                = "${var.name_prefix}-notification-dispatcher"
  description         = "Trigger notification dispatcher every hour"
  schedule_expression = "rate(1 hour)"  # Every hour to check user preferences

  tags = {
    Name = "${var.name_prefix}-notification-dispatcher"
  }
}

resource "aws_cloudwatch_event_target" "notification_dispatcher" {
  rule      = aws_cloudwatch_event_rule.notification_dispatcher.name
  target_id = "NotificationDispatcherLambda"
  arn       = var.notification_dispatcher_function_arn
}

resource "aws_lambda_permission" "allow_eventbridge_notification_dispatcher" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.notification_dispatcher_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.notification_dispatcher.arn
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "word_generation_function_arn" {
  type = string
}

variable "notification_dispatcher_function_arn" {
  type = string
}

output "daily_word_generation_rule_arn" {
  value = aws_cloudwatch_event_rule.daily_word_generation.arn
}

output "notification_dispatcher_rule_arn" {
  value = aws_cloudwatch_event_rule.notification_dispatcher.arn
}

