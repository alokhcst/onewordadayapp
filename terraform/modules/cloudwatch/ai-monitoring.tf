# CloudWatch Alarm for AI Word Generation Rate Limiting
resource "aws_cloudwatch_metric_alarm" "ai_rate_limit_approaching" {
  alarm_name          = "${var.name_prefix}-ai-rate-limit-approaching"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AIWordsGenerated"
  namespace           = "OneWordADay"
  period              = 86400 # 24 hours
  statistic           = "Sum"
  threshold           = 18 # Alert at 18 out of 20 daily limit
  alarm_description   = "Alert when AI word generation approaches daily limit (18/20)"
  alarm_actions       = []

  dimensions = {
    Environment = var.environment
  }
}

# CloudWatch Alarm for AI Generation Errors
resource "aws_cloudwatch_metric_alarm" "ai_generation_errors" {
  alarm_name          = "${var.name_prefix}-ai-generation-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when AI word generation has errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = "${var.name_prefix}-ai-word-generation"
  }
}

# CloudWatch Alarm for LLM Provider Failures
resource "aws_cloudwatch_metric_alarm" "llm_provider_failures" {
  alarm_name          = "${var.name_prefix}-llm-provider-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "LLMProviderFailures"
  namespace           = "OneWordADay"
  period              = 300
  statistic           = "Sum"
  threshold           = 3
  alarm_description   = "Alert when multiple LLM providers are failing"
  treat_missing_data  = "notBreaching"

  dimensions = {
    Environment = var.environment
  }
}

# Custom metric - Log daily AI usage
resource "aws_cloudwatch_log_metric_filter" "ai_words_generated" {
  name           = "${var.name_prefix}-ai-words-generated"
  log_group_name = "/aws/lambda/${var.name_prefix}-ai-word-generation"
  pattern        = "[time, request_id, level=INFO, msg=\"Word generated successfully\", ...]"

  metric_transformation {
    name      = "AIWordsGenerated"
    namespace = "OneWordADay"
    value     = "1"
    dimensions = {
      Environment = var.environment
    }
  }
}

# Custom metric - Track LLM provider failures
resource "aws_cloudwatch_log_metric_filter" "llm_failures" {
  name           = "${var.name_prefix}-llm-provider-failures"
  log_group_name = "/aws/lambda/${var.name_prefix}-ai-word-generation"
  pattern        = "[time, request_id, level=ERROR, msg=\"Error with*\", ...]"

  metric_transformation {
    name      = "LLMProviderFailures"
    namespace = "OneWordADay"
    value     = "1"
    dimensions = {
      Environment = var.environment
    }
  }
}

