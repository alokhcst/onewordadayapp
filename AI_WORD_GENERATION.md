# AI-Based Word Generation Feature

## Overview

This feature enables intelligent, personalized vocabulary word generation using free-tier LLM APIs (Groq Cloud, OpenRouter, Together AI). The system automatically selects the best available provider and generates words tailored to user profiles.

## Architecture

```
User Profile → AI Word Generation Lambda → LLM Router → [Groq/OpenRouter/Together AI]
                       ↓
                 DynamoDB Storage
                       ↓
                CloudWatch Monitoring
```

## Features

### ✅ **Multi-Provider LLM Routing**
- **Groq Cloud** (Priority 1): Llama 3.1, Mixtral models
- **OpenRouter** (Priority 2): Free Llama 3.1 models
- **Together AI** (Priority 3): Llama 3 fallback

### ✅ **Rate Limiting**
- **20 words per day per user**
- Usage tracking in DynamoDB
- Automatic reset at midnight UTC

### ✅ **Personalization**
- Age Group (child, teen, young_adult, adult, senior)
- Context (general, corporate, school, college, exam_prep)
- Exam Preparation (IELTS, TOEFL, GRE, SAT, etc.)
- Custom prompts

### ✅ **Security**
- API keys stored in AWS Secrets Manager
- IAM role-based permissions
- HTTPS-only communication

### ✅ **Monitoring & Alerts**
- CloudWatch metrics for:
  - Daily word generation count
  - LLM provider failures
  - Rate limit approaching (18/20 threshold)
- Custom log metrics

## Configuration

### Enable AI Generation

Update `terraform.tfvars`:

```hcl
use_ai_generation = "true"  # Enable AI-based generation
```

### API Keys Setup

1. Get API keys from:
   - **Groq**: https://console.groq.com/
   - **OpenRouter**: https://openrouter.ai/
   - **Together AI**: https://www.together.ai/

2. Update AWS Secrets Manager:

```bash
aws secretsmanager update-secret \
  --secret-id onewordaday-production/llm-api-keys \
  --secret-string '{
    "groq": "your-groq-api-key",
    "openrouter": "your-openrouter-api-key",
    "together": "your-together-api-key"
  }'
```

## Deployment

### 1. Build Lambda Functions

```bash
cd backend
npm run build
```

### 2. Deploy Infrastructure

```bash
cd ../terraform
terraform init
terraform plan
terraform apply
```

### 3. Verify Deployment

```bash
# Check Lambda function
aws lambda get-function \
  --function-name onewordaday-production-ai-word-generation

# Test AI generation
aws lambda invoke \
  --function-name onewordaday-production-ai-word-generation \
  --payload '{"userId":"test-user"}' \
  response.json
```

## Usage

### Manual Trigger (API Gateway)

```bash
POST /word/ai-generate
Authorization: Bearer {cognito-id-token}
Content-Type: application/json

{
  "customPrompt": "Generate a word related to business communication"
}
```

### Automatic Daily Generation

The system automatically runs at midnight UTC via EventBridge, generating personalized words for all users when `USE_AI_GENERATION=true`.

## API Response Format

```json
{
  "word": "eloquent",
  "definition": "Fluent or persuasive in speaking or writing",
  "partOfSpeech": "adjective",
  "pronunciation": "/ˈɛləkwənt/",
  "syllables": "el-o-quent",
  "difficulty": 3,
  "sentences": [
    "Her eloquent speech moved the audience to tears.",
    "The lawyer made an eloquent argument in defense of his client.",
    "He is known for his eloquent writing style."
  ],
  "synonyms": ["articulate", "expressive", "fluent"],
  "antonyms": ["inarticulate", "ineloquent"],
  "usageContext": "Use when describing someone who speaks or writes effectively",
  "etymology": "From Latin eloquens, meaning speaking out"
}
```

## Rate Limiting

- **Limit**: 20 words/day/user
- **Reset**: Midnight UTC
- **429 Response** when limit exceeded:

```json
{
  "message": "Daily word generation limit reached (20 words/day)",
  "remaining": 0,
  "resetAt": "2025-11-07T00:00:00.000Z"
}
```

## Monitoring

### CloudWatch Dashboards

Access metrics at:
`https://console.aws.amazon.com/cloudwatch/home?region=us-east-1`

### Key Metrics

1. **AIWordsGenerated** - Daily word generation count
2. **LLMProviderFailures** - Failed LLM API calls
3. **Lambda Errors** - Function execution failures

### Alarms

- ⚠️ **ai-rate-limit-approaching**: Triggers at 18/20 daily limit
- ⚠️ **ai-generation-errors**: Triggers after 5 errors in 5 minutes
- ⚠️ **llm-provider-failures**: Triggers after 3+ provider failures

## Cost Optimization

### Free Tier Limits

| Provider | Free Tier | Rate Limit |
|----------|-----------|------------|
| **Groq** | 30 req/min | Very fast |
| **OpenRouter** | 20 req/min | Free models |
| **Together AI** | 10 req/min | Basic |

### Caching Strategy

The system caches:
- Common word requests in DynamoDB
- User preferences for faster lookups
- Recent words to avoid repetition

### Rate Limiting

- **Per-user limit**: 20 words/day
- **Provider rotation**: Automatic failover
- **Retry logic**: Exponential backoff

## Troubleshooting

### Issue: All LLM Providers Failing

**Solution**:
1. Check API keys in Secrets Manager
2. Verify IAM permissions
3. Check CloudWatch logs:

```bash
aws logs tail /aws/lambda/onewordaday-production-ai-word-generation --since 5m
```

### Issue: Rate Limit Not Working

**Solution**:
1. Verify `AI_USAGE_TABLE` environment variable
2. Check DynamoDB table exists
3. Review Lambda IAM permissions

### Issue: Poor Quality Words

**Solution**:
1. Update user profile (age, context, exam prep)
2. Provide custom prompt for specific needs
3. Adjust difficulty preference in profile

## Migration from Word Bank

To migrate from static word bank to AI generation:

1. **Set environment variable**:
   ```hcl
   use_ai_generation = "true"
   ```

2. **Keep word bank as fallback**:
   - System automatically falls back to word bank if AI fails
   - No data loss

3. **Gradual rollout**:
   - Test with subset of users
   - Monitor CloudWatch metrics
   - Scale to all users

## Development

### Local Testing

```bash
# Install dependencies
cd backend
npm install

# Set environment variables
export GROQ_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"
export TOGETHER_API_KEY="your-key"

# Run tests
node -e "require('./src/ai-word-generation/index.js').handler({userId:'test'})"
```

### Adding New LLM Providers

Edit `backend/src/ai-word-generation/index.js`:

```javascript
const LLM_PROVIDERS = {
  NEW_PROVIDER: {
    name: 'New Provider',
    apiUrl: 'https://api.newprovider.com/v1/chat',
    models: ['model-name'],
    rateLimit: { requests: 10, window: 60000 },
    priority: 4
  }
};
```

## Security Considerations

1. **API Key Rotation**: Rotate keys every 90 days
2. **IAM Permissions**: Use least privilege principle
3. **Encryption**: All data encrypted at rest and in transit
4. **Rate Limiting**: Prevents abuse and cost overruns
5. **CloudWatch Monitoring**: Real-time security alerts

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review this documentation
3. Contact: alok.hcst@gmail.com

