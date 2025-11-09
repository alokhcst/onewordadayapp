# AI-Powered Next Word Feature

## Overview

The "Get Next Word" functionality now uses AI to generate personalized vocabulary words with contextual images based on user preferences and learning criteria.

## Features

### 1. AI Word Generation
- Uses multiple LLM providers (Groq, OpenRouter, Together AI) with automatic fallback
- Generates words based on:
  - User's age group (child, teen, young_adult, adult, senior)
  - Learning context (general, professional, academic, etc.)
  - Difficulty preference
  - Exam preparation goals (SAT, GRE, IELTS, etc.)

### 2. Image Integration
- Automatically fetches relevant images from Unsplash API
- Images visually convey the meaning of the word
- Falls back gracefully if no image is available

### 3. Word Repetition Prevention
- Tracks last 90 days of user's words
- Excludes recently used words from AI generation
- Ensures fresh vocabulary every day

### 4. Intelligent Fallback
- Primary: AI-based generation with images
- Fallback: Word bank selection with context enrichment
- Ensures words are always available even if AI services are down

## How It Works

### Word Generation Flow

```
User requests next word
    ↓
Check for existing word for today
    ↓
If not exists or skipped:
    ↓
Get user profile & recent words (90 days)
    ↓
Try AI Generation:
    ↓
    ├─→ Call LLM (Groq → OpenRouter → Together)
    ├─→ Fetch image from Unsplash
    └─→ If fails: Use word bank
    ↓
Store word in DynamoDB
    ↓
Return personalized word with image
```

## API Configuration

### Environment Variables

**get-todays-word Lambda:**
- `USE_AI_GENERATION`: "true" to enable AI generation (default: true)
- `SECRET_NAME`: "onewordaday/llm-api-keys" (stores API keys)
- `USERS_TABLE`: User profiles table
- `DAILY_WORDS_TABLE`: Daily words storage
- `WORD_BANK_TABLE`: Fallback word bank
- `AWS_REGION`: AWS region

### Required API Keys (in AWS Secrets Manager)

Store in secret: `onewordaday/llm-api-keys`

```json
{
  "groq": "your-groq-api-key",
  "openrouter": "your-openrouter-api-key",
  "together": "your-together-ai-api-key",
  "unsplash": "your-unsplash-api-key"
}
```

## Setting Up API Keys

### 1. Groq API (Recommended - Free Tier)
- Visit: https://console.groq.com
- Create account and get API key
- Fast inference with Llama models

### 2. OpenRouter API (Fallback)
- Visit: https://openrouter.ai
- Free tier available with various models
- Good for diverse model access

### 3. Together AI (Secondary Fallback)
- Visit: https://www.together.ai
- Multiple open-source models
- Good pricing

### 4. Unsplash API (Image Generation)
- Visit: https://unsplash.com/developers
- Create app and get Access Key
- 50 requests/hour on free tier

### Update AWS Secrets Manager

```powershell
# Using AWS CLI
aws secretsmanager create-secret \
  --name onewordaday/llm-api-keys \
  --secret-string '{
    "groq": "gsk_...",
    "openrouter": "sk-or-v1-...",
    "together": "...",
    "unsplash": "..."
  }'

# Or update existing secret
aws secretsmanager update-secret \
  --secret-id onewordaday/llm-api-keys \
  --secret-string '{
    "groq": "gsk_...",
    "openrouter": "sk-or-v1-...",
    "together": "...",
    "unsplash": "..."
  }'
```

## Word Data Structure

```javascript
{
  "userId": "user-123",
  "date": "2025-11-07",
  "wordId": "uuid-...",
  "word": "serendipity",
  "syllables": "ser-en-dip-i-ty",
  "pronunciation": "/ˌserənˈdipədē/",
  "definition": "The occurrence of events by chance in a happy way",
  "partOfSpeech": "noun",
  "difficulty": 3,
  "sentences": [
    "Finding that book was pure serendipity.",
    "Their meeting was a fortunate serendipity.",
    "It was serendipity that we bumped into each other."
  ],
  "synonyms": ["fortune", "luck", "chance"],
  "antonyms": ["misfortune", "bad luck"],
  "imageUrl": "https://images.unsplash.com/...",
  "audioUrl": "",
  "usageContext": "Used to describe happy accidents",
  "etymology": "From Persian fairy tale 'The Three Princes of Serendip'",
  "userContext": "general",
  "ageGroup": "adult",
  "provider": "Groq",
  "generationMethod": "AI",
  "practiceStatus": "pending",
  "createdAt": "2025-11-07T10:30:00.000Z"
}
```

## Deployment

### 1. Build Lambda Functions

```powershell
cd backend
npm run build
```

This creates:
- `dist/get-todays-word.zip`
- `dist/ai-word-generation.zip`

### 2. Deploy with Terraform

```powershell
cd terraform
terraform plan   # Review changes
terraform apply  # Deploy
```

### 3. Verify Deployment

```powershell
# Check Lambda function configuration
aws lambda get-function-configuration \
  --function-name onewordaday-production-get-todays-word

# Check environment variables
aws lambda get-function-configuration \
  --function-name onewordaday-production-get-todays-word \
  --query 'Environment.Variables'
```

## Testing

### Test Next Word Generation

```bash
# Via API Gateway
curl -X GET \
  https://your-api-gateway-url/word/today \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response

```json
{
  "message": "Word generated successfully",
  "word": {
    "word": "ephemeral",
    "definition": "Lasting for a very short time",
    "imageUrl": "https://images.unsplash.com/...",
    "sentences": ["...", "...", "..."],
    "...": "..."
  },
  "generated": true
}
```

## Monitoring

### CloudWatch Logs

```powershell
# Check logs for get-todays-word
aws logs tail /aws/lambda/onewordaday-production-get-todays-word --follow

# Look for:
# - "Using AI-based word generation with image"
# - "Word generated successfully: [word] (method: AI)"
# - "Fetching image for word: [word]"
```

### Key Metrics
- AI generation success rate
- Image fetch success rate
- Fallback to word bank rate
- Average response time

## Troubleshooting

### Issue: 502 Bad Gateway
**Solution:** Run the fix script:
```powershell
cd scripts
.\fix-502.ps1
```

### Issue: No image returned
**Causes:**
- Unsplash API key missing or invalid
- Rate limit exceeded (50 req/hour on free tier)
- No matching images found for word

**Solution:**
- Verify API key in Secrets Manager
- Check Unsplash dashboard for usage
- Words still work without images (imageUrl will be empty)

### Issue: AI generation fails
**Causes:**
- All LLM providers API keys missing
- Rate limits exceeded
- Network connectivity issues

**Solution:**
- System automatically falls back to word bank
- Check logs for specific provider errors
- Verify API keys are valid

### Issue: Word repetition
**Check:**
- Recent words tracking is working
- 90-day window is sufficient
- Excluded words list is being passed to AI

## Cost Optimization

### Free Tier Usage
- **Groq**: 14,400 requests/day free
- **OpenRouter**: Various free models available  
- **Together AI**: Free trial credits
- **Unsplash**: 50 requests/hour free

### Recommended for Production
- Use Groq as primary (fast + generous free tier)
- OpenRouter as fallback (diverse models)
- Cache images in S3 to reduce Unsplash calls
- Monitor usage in CloudWatch

## Future Enhancements

1. **Audio Pronunciation**
   - Integrate TTS API for word pronunciation
   - Store MP3 files in S3

2. **Image Caching**
   - Download and store images in S3
   - Reduce Unsplash API calls
   - Faster image loading

3. **Advanced AI Features**
   - Context-aware sentence generation using user's history
   - Adaptive difficulty based on user performance
   - Multi-language support

4. **User Preferences**
   - Custom word topics (e.g., "technology", "nature")
   - Exclude word categories
   - Preferred difficulty range

## Support

For issues or questions:
1. Check CloudWatch logs
2. Verify API keys in Secrets Manager
3. Test with fallback (set `USE_AI_GENERATION=false`)
4. Review this documentation

---

**Last Updated:** November 7, 2025

