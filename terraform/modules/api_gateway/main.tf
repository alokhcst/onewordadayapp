# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.name_prefix}-api"
  description = "One Word A Day API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.name_prefix}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# /user resource
resource "aws_api_gateway_resource" "user" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "user"
}

# /user/profile resource
resource "aws_api_gateway_resource" "user_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.user.id
  path_part   = "profile"
}

# GET /user/profile
resource "aws_api_gateway_method" "get_user_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_user_profile" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_profile.id
  http_method             = aws_api_gateway_method.get_user_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions.user_preferences.invoke_arn
}

# PUT /user/profile
resource "aws_api_gateway_method" "put_user_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "put_user_profile" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.user_profile.id
  http_method             = aws_api_gateway_method.put_user_profile.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions.user_preferences.invoke_arn
}

# /word resource
resource "aws_api_gateway_resource" "word" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "word"
}

# /word/today resource
resource "aws_api_gateway_resource" "word_today" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.word.id
  path_part   = "today"
}

# GET /word/today
resource "aws_api_gateway_method" "get_word_today" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.word_today.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_word_today" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.word_today.id
  http_method             = aws_api_gateway_method.get_word_today.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions.get_todays_word.invoke_arn
}

# OPTIONS /word/today
resource "aws_api_gateway_method" "options_word_today" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.word_today.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_word_today" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_today.id
  http_method = aws_api_gateway_method.options_word_today.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_word_today" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_today.id
  http_method = aws_api_gateway_method.options_word_today.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_word_today" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_today.id
  http_method = aws_api_gateway_method.options_word_today.http_method
  status_code = aws_api_gateway_method_response.options_word_today.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# /word/history resource
resource "aws_api_gateway_resource" "word_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.word.id
  path_part   = "history"
}

# GET /word/history
resource "aws_api_gateway_method" "get_word_history" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.word_history.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "get_word_history" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.word_history.id
  http_method             = aws_api_gateway_method.get_word_history.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions.word_history.invoke_arn
}

# OPTIONS /word/history
resource "aws_api_gateway_method" "options_word_history" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.word_history.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_word_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_history.id
  http_method = aws_api_gateway_method.options_word_history.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_word_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_history.id
  http_method = aws_api_gateway_method.options_word_history.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_word_history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.word_history.id
  http_method = aws_api_gateway_method.options_word_history.http_method
  status_code = aws_api_gateway_method_response.options_word_history.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# /feedback resource
resource "aws_api_gateway_resource" "feedback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "feedback"
}

# POST /feedback
resource "aws_api_gateway_method" "post_feedback" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feedback.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "post_feedback" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.feedback.id
  http_method             = aws_api_gateway_method.post_feedback.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_functions.feedback_processor.invoke_arn
}

# OPTIONS /feedback
resource "aws_api_gateway_method" "options_feedback" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feedback.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_feedback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.options_feedback.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_feedback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.options_feedback.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_feedback" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feedback.id
  http_method = aws_api_gateway_method.options_feedback.http_method
  status_code = aws_api_gateway_method_response.options_feedback.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda permissions
resource "aws_lambda_permission" "api_gateway_user_preferences" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions.user_preferences.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_get_todays_word" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions.get_todays_word.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_word_history" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions.word_history.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_feedback_processor" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_functions.feedback_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CORS Configuration
resource "aws_api_gateway_method" "options_user_profile" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.user_profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_user_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.options_user_profile.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_user_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.options_user_profile.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options_user_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.user_profile.id
  http_method = aws_api_gateway_method.options_user_profile.http_method
  status_code = aws_api_gateway_method_response.options_user_profile.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Gateway Response (for 4xx errors)
resource "aws_api_gateway_gateway_response" "cors_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
}

# CORS Gateway Response (for 5xx errors)
resource "aws_api_gateway_gateway_response" "cors_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
}

# API Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.get_user_profile,
    aws_api_gateway_integration.put_user_profile,
    aws_api_gateway_integration.get_word_today,
    aws_api_gateway_integration.get_word_history,
    aws_api_gateway_integration.post_feedback,
    aws_api_gateway_gateway_response.cors_4xx,
    aws_api_gateway_gateway_response.cors_5xx
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.name_prefix}"
  retention_in_days = 30
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "main" {
  name = "${var.name_prefix}-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  throttle_settings {
    burst_limit = 500
    rate_limit  = 1000
  }

  quota_settings {
    limit  = 10000
    period = "DAY"
  }
}

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "cognito_user_pool_arn" {
  type = string
}

variable "lambda_functions" {
  type = any
}

output "api_url" {
  value = "${aws_api_gateway_stage.main.invoke_url}"
}

output "api_id" {
  value = aws_api_gateway_rest_api.main.id
}

