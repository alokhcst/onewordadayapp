# AI Word Generation Deployment Guide

## Quick Start

### Step 1: Get API Keys (Free)

#### Groq Cloud (Recommended - Fastest)
1. Visit: https://console.groq.com/
2. Sign up for free account
3. Create API key
4. Free tier: 30 requests/minute

#### OpenRouter (Backup)
1. Visit: https://openrouter.ai/
2. Sign up
3. Create API key
4. Use free models

#### Together AI (Fallback)
1. Visit: https://www.together.ai/
2. Sign up
3. Create API key
4. Free tier available

### Step 2: Configure Secrets

```bash
# Update the Secrets Manager with your API keys
aws secretsmanager update-secret \
  --secret-id onewordaday-production/llm-api-keys \
  --secret-string '{
    "groq": "gsk_YOUR_GROQ_API_KEY_HERE",
    "openrouter": "sk-or-v1-YOUR_OPENROUTER_KEY",
    "together": "YOUR_TOGETHER_AI_KEY"
  }' \
  --region us-east-1
```

### Step 3: Enable AI Generation

Update `terraform/terraform.tfvars`:

```hcl
# Enable AI-based word generation
use_ai_generation = "true"
```

### Step 4: Deploy

```bash
# Build Lambda functions
cd backend
npm run build

# Deploy infrastructure
cd ../terraform
terraform init
terraform apply
```

### Step 5: Verify

```bash
# Test the AI word generation
aws lambda invoke \
  --function-name onewordaday-production-ai-word-generation \
  --payload '{"requestContext":{"authorizer":{"claims":{"sub":"test-user-123"}}}}' \
  --region us-east-1 \
  output.json

# Check the result
cat output.json
```

## Testing

### Test AI Generation with Sample Request

```bash
# Create test payload
cat > test-payload.json <<EOF
{
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123"
      }
    }
  },
  "body": "{\"customPrompt\": \"Generate a business-related word\"}"
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name onewordaday-production-ai-word-generation \
  --payload file://test-payload.json \
  --region us-east-1 \
  response.json

# View response
cat response.json | jq
```

### Expected Response

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  "body": {
    "message": "Word generated successfully",
    "word": {
      "word": "synergy",
      "definition": "The interaction of elements that produces an effect greater than the sum of individual effects",
      "partOfSpeech": "noun",
      "pronunciation": "/ˈsɪnərdʒi/",
      "syllables": "syn-er-gy",
      "difficulty": 3,
      "sentences": [
        "The team's synergy led to exceptional results.",
        "There's a natural synergy between marketing and sales.",
        "The merger created positive synergies."
      ],
      "synonyms": ["cooperation", "collaboration", "teamwork"],
      "antonyms": ["discord", "conflict"],
      "usageContext": "Common in business contexts",
      "provider": "Groq"
    },
    "remaining": 19,
    "provider": "Groq"
  }
}
```

## Monitoring

### Check CloudWatch Logs

```bash
# View recent AI generation logs
aws logs tail /aws/lambda/onewordaday-production-ai-word-generation \
  --since 10m \
  --follow \
  --region us-east-1
```

### Monitor Usage

```bash
# Check daily usage for a user
aws dynamodb get-item \
  --table-name onewordaday-production-ai-usage \
  --key '{"userId":{"S":"test-user-123"},"date":{"S":"2025-11-06"}}' \
  --region us-east-1
```

### View CloudWatch Metrics

```bash
# Open CloudWatch dashboard
aws cloudwatch get-dashboard \
  --dashboard-name onewordaday-production-dashboard \
  --region us-east-1
```

## Rollback

If you need to revert to word bank generation:

```bash
# Update terraform.tfvars
use_ai_generation = "false"

# Apply changes
cd terraform
terraform apply
```

## Troubleshooting

### Issue: Lambda function not found

**Solution**:
```bash
# Check if function exists
aws lambda get-function \
  --function-name onewordaday-production-ai-word-generation \
  --region us-east-1

# If not, redeploy
cd terraform
terraform apply
```

### Issue: Secrets not accessible

**Solution**:
```bash
# Verify secret exists
aws secretsmanager describe-secret \
  --secret-id onewordaday-production/llm-api-keys \
  --region us-east-1

# Check IAM permissions
aws iam get-role-policy \
  --role-name onewordaday-production-lambda-role \
  --policy-name onewordaday-production-lambda-policy \
  --region us-east-1
```

### Issue: Rate limit errors

**Solution**:
```bash
# Check usage table
aws dynamodb scan \
  --table-name onewordaday-production-ai-usage \
  --region us-east-1

# Reset usage for testing (optional)
aws dynamodb delete-item \
  --table-name onewordaday-production-ai-usage \
  --key '{"userId":{"S":"test-user-123"},"date":{"S":"2025-11-06"}}' \
  --region us-east-1
```

## Cost Analysis

### Free Tier Usage

With 20 words/day/user:
- **Groq**: 600 words/month/user → FREE
- **OpenRouter**: Backup → FREE (free models)
- **Together AI**: Fallback → FREE

### AWS Costs (Estimated)

| Service | Usage | Cost/Month |
|---------|-------|------------|
| Lambda (AI Generation) | 20 invocations/day/user | $0.00 (free tier) |
| DynamoDB (AI Usage) | 600 writes/month/user | $0.00 (free tier) |
| Secrets Manager | 1 secret | $0.40 |
| CloudWatch Logs | ~1MB/day | $0.00 (free tier) |
| **Total** | | **~$0.40/month** |

## Security Checklist

- [ ] API keys stored in Secrets Manager
- [ ] IAM roles configured with least privilege
- [ ] Rate limiting enabled (20 words/day)
- [ ] CloudWatch monitoring active
- [ ] HTTPS-only endpoints
- [ ] Cognito authentication required

## Next Steps

1. **Configure API Keys** ✅
2. **Enable AI Generation** ✅
3. **Deploy to Production** ✅
4. **Monitor CloudWatch** 
5. **Gather User Feedback**
6. **Optimize Prompts**
7. **Add More Providers** (optional)

## Support

- Documentation: See `AI_WORD_GENERATION.md`
- Logs: CloudWatch `/aws/lambda/onewordaday-production-ai-word-generation`
- Metrics: CloudWatch Dashboard `onewordaday-production-dashboard`

