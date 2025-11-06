# One Word A Day 📚

A personalized vocabulary learning app that delivers context-aware daily words with intelligent practice reinforcement.

## Features

- 📖 **Daily Word Generation**: Personalized vocabulary based on age, context, and learning patterns
- 🔔 **Multi-Channel Notifications**: Push, SMS, and email notifications
- 🎯 **Context-Aware Learning**: Words tailored to your professional or academic context
- 📊 **Progress Tracking**: Monitor your vocabulary growth over time
- 💬 **Feedback System**: Share feedback to improve personalization
- 🌐 **AWS-Powered Backend**: Scalable, serverless architecture

## Architecture

### Frontend
- **React Native** with Expo Go
- **AWS Amplify** for authentication
- **Expo Router** for navigation
- **TypeScript** for type safety

### Backend
- **AWS Cognito**: User authentication
- **API Gateway**: REST API endpoints
- **Lambda Functions**: Serverless business logic
- **DynamoDB**: NoSQL database
- **S3 + CloudFront**: Media storage and delivery
- **SNS + SES**: Notification services
- **EventBridge**: Scheduled automation
- **Amazon Bedrock**: AI-powered content generation

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [Terraform](https://www.terraform.io/) (v1.0 or higher)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Quick Start

### 1. Clone and Install

```bash
cd onewordadayapp
npm install
cd backend && npm install && cd ..
```

### 2. Configure AWS Credentials

```bash
aws configure
```

### 3. Set Up Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 4. Deploy Infrastructure

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This script will:
- Build Lambda functions
- Create Lambda layers
- Deploy AWS infrastructure
- Generate `.env` file with outputs

### 5. Populate Word Bank

```bash
cd backend
export WORD_BANK_TABLE=onewordaday-dev-word-bank
node ../scripts/populate-word-bank.js
```

### 6. Configure SES Email

1. Go to AWS SES Console
2. Verify the sender email: `noreply@yourdomain.com`
3. Request production access if needed

### 7. Set Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URIs:
   - `onewordadayapp://`
   - `https://your-cognito-domain/oauth2/idpresponse`
4. Update `terraform.tfvars` with credentials
5. Redeploy: `cd terraform && terraform apply`

### 8. Start the App

```bash
npx expo start
```

Scan the QR code with Expo Go app on your phone!

## Project Structure

```
onewordadayapp/
├── app/                      # React Native screens
│   ├── (auth)/              # Authentication screens
│   ├── (tabs)/              # Main app tabs
│   └── feedback.tsx         # Feedback screen
├── backend/                 # Lambda functions
│   ├── src/
│   │   ├── word-generation/
│   │   ├── content-enrichment/
│   │   ├── notification-dispatcher/
│   │   ├── feedback-processor/
│   │   ├── user-preferences/
│   │   ├── get-todays-word/
│   │   └── word-history/
│   └── build.js            # Build script
├── terraform/              # Infrastructure as Code
│   ├── main.tf
│   └── modules/
│       ├── cognito/
│       ├── dynamodb/
│       ├── s3/
│       ├── lambda/
│       ├── api_gateway/
│       ├── sns/
│       ├── eventbridge/
│       └── cloudwatch/
├── lib/                    # Shared utilities
│   ├── aws-config.ts
│   ├── auth.ts
│   └── api.ts
├── contexts/               # React contexts
│   └── AuthContext.tsx
└── scripts/               # Deployment scripts
    ├── deploy.sh
    ├── destroy.sh
    └── populate-word-bank.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get user profile |
| PUT | `/user/profile` | Update user profile |
| GET | `/word/today` | Get today's word |
| GET | `/word/history` | Get word history |
| POST | `/feedback` | Submit feedback |

## Environment Variables

### Frontend (.env)
```
EXPO_PUBLIC_USER_POOL_ID=your-user-pool-id
EXPO_PUBLIC_USER_POOL_CLIENT_ID=your-client-id
EXPO_PUBLIC_IDENTITY_POOL_ID=your-identity-pool-id
EXPO_PUBLIC_OAUTH_DOMAIN=your-domain.auth.region.amazoncognito.com
EXPO_PUBLIC_API_ENDPOINT=https://your-api.execute-api.region.amazonaws.com/dev
```

### Backend (Lambda Environment)
Set automatically by Terraform:
- `USERS_TABLE`
- `DAILY_WORDS_TABLE`
- `WORD_BANK_TABLE`
- `FEEDBACK_TABLE`
- `NOTIFICATION_LOGS_TABLE`
- `AUDIO_BUCKET`
- `IMAGES_BUCKET`

## Development

### Run Frontend Locally
```bash
npx expo start
```

### Test Lambda Functions
```bash
cd backend
node src/word-generation/index.js
```

### Update Infrastructure
```bash
cd terraform
terraform plan
terraform apply
```

## Deployment Phases

### Phase 1: MVP (Current)
- ✅ User authentication
- ✅ Daily word generation
- ✅ Push notifications
- ✅ Feedback system
- ✅ Basic UI

### Phase 2: Enhanced Features
- [ ] SMS and email notifications
- [ ] Advanced word filtering
- [ ] Daily events integration
- [ ] Audio pronunciation
- [ ] Word images

### Phase 3: AI Integration
- [ ] Amazon Bedrock for sentences
- [ ] Adaptive learning algorithm
- [ ] Personalized difficulty

### Phase 4: Polish & Scale
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] App store submission

## Monitoring

View CloudWatch metrics:
```bash
# Open CloudWatch Dashboard
aws cloudwatch get-dashboard --dashboard-name onewordaday-dev-dashboard
```

View Lambda logs:
```bash
aws logs tail /aws/lambda/onewordaday-dev-word-generation --follow
```

## Troubleshooting

### Lambda Function Errors
```bash
# Check logs
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Redeploy function
cd backend && npm run build && cd ../terraform && terraform apply
```

### API Gateway 403 Errors
- Verify Cognito token is being sent
- Check API Gateway authorizer configuration
- Confirm user is authenticated

### No Daily Word Generated
- Check EventBridge rule is enabled
- Verify Lambda has DynamoDB permissions
- Check word bank has entries

## Clean Up

To destroy all infrastructure:

```bash
chmod +x scripts/destroy.sh
./scripts/destroy.sh
```

**Warning**: This will delete all data permanently!

## Cost Estimation

Monthly AWS costs (approximate):

- **Light Usage** (100 users): $5-10
- **Medium Usage** (1,000 users): $20-40
- **Heavy Usage** (10,000 users): $100-200

Main cost drivers:
- DynamoDB operations
- Lambda invocations
- SNS notifications (SMS)
- API Gateway requests

## Security Best Practices

1. ✅ Rotate AWS credentials regularly
2. ✅ Enable MFA on AWS account
3. ✅ Use IAM roles with least privilege
4. ✅ Encrypt data at rest and in transit
5. ✅ Monitor CloudWatch logs
6. ✅ Keep dependencies updated

## Contributing

This is a personal project, but suggestions are welcome!

## License

MIT License - feel free to use this for learning or building your own version.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review AWS CloudWatch logs
3. Examine Lambda function code

## Acknowledgments

Built with:
- React Native & Expo
- AWS Services
- Terraform
- TypeScript

---

**Made with ❤️ for vocabulary learners everywhere**
