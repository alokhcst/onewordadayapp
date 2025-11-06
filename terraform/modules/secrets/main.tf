# Secrets Manager for LLM API Keys
resource "aws_secretsmanager_secret" "llm_api_keys" {
  name                    = "${var.name_prefix}/llm-api-keys"
  description             = "API keys for LLM providers (Groq, OpenRouter, Together AI)"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.name_prefix}-llm-api-keys"
  }
}

# Create secret with placeholder values
# Update these values manually after deployment
resource "aws_secretsmanager_secret_version" "llm_api_keys_version" {
  secret_id = aws_secretsmanager_secret.llm_api_keys.id
  secret_string = jsonencode({
    groq       = "your-groq-api-key-here"
    openrouter = "your-openrouter-api-key-here"
    together   = "your-together-api-key-here"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

output "llm_api_keys_secret_arn" {
  value = aws_secretsmanager_secret.llm_api_keys.arn
}

output "llm_api_keys_secret_name" {
  value = aws_secretsmanager_secret.llm_api_keys.name
}

