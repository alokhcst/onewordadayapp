# CloudWatch Log Groups are created automatically by Lambda functions

# CloudWatch Alarms for Lambda Errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.name_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors lambda function errors"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.name_prefix}-lambda-errors-alarm"
  }
}

# CloudWatch Alarm for API Gateway 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.name_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This metric monitors API Gateway 5XX errors"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.name_prefix}-api-5xx-errors-alarm"
  }
}

# CloudWatch Alarm for API Gateway Latency
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.name_prefix}-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 1000  # 1 second
  alarm_description   = "This metric monitors API Gateway latency"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.name_prefix}-api-latency-alarm"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum" }],
            [".", "Errors", { stat = "Sum" }],
            [".", "Duration", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum" }],
            [".", "4XXError", { stat = "Sum" }],
            [".", "5XXError", { stat = "Sum" }],
            [".", "Latency", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "API Gateway Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum" }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Metrics"
        }
      }
    ]
  })
}

data "aws_region" "current" {}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

output "dashboard_arn" {
  value = aws_cloudwatch_dashboard.main.dashboard_arn
}

