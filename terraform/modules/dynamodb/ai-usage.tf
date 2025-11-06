# AI Usage Tracking Table
resource "aws_dynamodb_table" "ai_usage" {
  name           = "${var.name_prefix}-ai-usage"
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

  point_in_time_recovery {
    enabled = true
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${var.name_prefix}-ai-usage-table"
  }
}

output "ai_usage_table_name" {
  value = aws_dynamodb_table.ai_usage.name
}

output "ai_usage_table_arn" {
  value = aws_dynamodb_table.ai_usage.arn
}

