# Deployment Guide

Complete guide for deploying One Word A Day to AWS.

## Prerequisites

### Required Tools
- AWS CLI (configured with credentials)
- Terraform >= 1.0
- Node.js >= 18
- npm or yarn
- Expo CLI

### AWS Account Requirements
- Active AWS account
- IAM user with administrator access
- Verified SES email (for production email sending)
- Google OAuth credentials (optional)

## Step-by-Step Deployment

### 1. Initial Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure AWS

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

### 3. Terraform Configuration

```bash
cd terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars
nano terraform.tfvars
```

Update these values:
```hcl
aws_region = "us-east-1"
environment = "dev"
project_name = "onewordaday"

# Optional: Google OAuth
google_client_id = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
```

### 4. Build Lambda Functions

```bash
cd backend

# Install dependencies
npm install

# Build all functions
npm run build
```

This creates:
- `backend/dist/*.zip` - Individual Lambda functions
- `backend/layers/dependencies.zip` - Shared dependencies layer

### 5. Deploy Infrastructure

#### Option A: Automated Deployment

```bash
# From project root
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### Option B: Manual Deployment

```bash
cd terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply
```

Terraform will create:
- Cognito User Pool and Client
- API Gateway
- 7 Lambda Functions
- 5 DynamoDB Tables
- 3 S3 Buckets
- CloudFront Distribution
- SNS Topics
- EventBridge Rules
- CloudWatch Alarms

### 6. Retrieve Deployment Outputs

```bash
cd terraform

# Get all outputs
terraform output

# Get specific values
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(terraform output -raw cognito_client_id)
API_URL=$(terraform output -raw api_gateway_url)

echo $USER_POOL_ID
echo $CLIENT_ID
echo $API_URL
```

### 7. Configure Frontend

Create `.env` file in project root:

```bash
cat > .env << EOF
EXPO_PUBLIC_USER_POOL_ID=$USER_POOL_ID
EXPO_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID
EXPO_PUBLIC_API_ENDPOINT=$API_URL
EOF
```

### 8. Populate Word Bank

```bash
# Set environment variable
export WORD_BANK_TABLE=onewordaday-dev-word-bank

# Run population script
cd backend
node ../scripts/populate-word-bank.js
```

Verify in AWS Console:
```bash
aws dynamodb scan --table-name onewordaday-dev-word-bank --select COUNT
```

### 9. Configure SES (Email Notifications)

1. Navigate to AWS SES Console
2. Go to "Verified identities"
3. Click "Create identity"
4. Select "Email address"
5. Enter: `noreply@yourdomain.com`
6. Click verification link in email

For production:
```bash
# Request production access
aws ses put-account-sending-enabled --enabled
```

### 10. Test the Deployment

```bash
# Start Expo development server
npx expo start

# Or specific platform
npx expo start --ios
npx expo start --android
```

## Post-Deployment Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   ```
   onewordadayapp://
   https://YOUR_COGNITO_DOMAIN.auth.REGION.amazoncognito.com/oauth2/idpresponse
   ```
6. Update `terraform.tfvars`:
   ```hcl
   google_client_id = "your-client-id.apps.googleusercontent.com"
   google_client_secret = "your-client-secret"
   ```
7. Redeploy:
   ```bash
   cd terraform
   terraform apply
   ```

### Notification Configuration

#### Push Notifications (Already Configured)
- Uses Expo Push Notification Service
- No additional configuration needed

#### SMS Notifications
1. Go to AWS SNS Console
2. Request production access for SMS
3. Set spending limit
4. Configure sender ID (country-specific)

#### Email Notifications
- Already configured via SES
- Verify sender email (done in step 9)
- For production: request sending limit increase

### CloudWatch Alarms

Set up alerts:

```bash
# Get your email
EMAIL="your-email@example.com"

# Create SNS topic for alarms
aws sns create-topic --name onewordaday-alarms

# Subscribe to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:onewordaday-alarms \
  --protocol email \
  --notification-endpoint $EMAIL
```

## Verification Steps

### 1. Test User Registration

```bash
# Using AWS CLI
aws cognito-idp sign-up \
  --client-id $CLIENT_ID \
  --username test@example.com \
  --password TestPassword123!
```

### 2. Test API Endpoints

```bash
# Get ID token first (via app)
ID_TOKEN="your-id-token"

# Test get today's word
curl -H "Authorization: Bearer $ID_TOKEN" \
  $API_URL/word/today
```

### 3. Test Lambda Functions

```bash
# Manually invoke word generation
aws lambda invoke \
  --function-name onewordaday-dev-word-generation \
  --payload '{}' \
  response.json

cat response.json
```

### 4. Check EventBridge Rules

```bash
# List rules
aws events list-rules

# Check rule status
aws events describe-rule --name onewordaday-dev-daily-word-generation
```

### 5. Monitor CloudWatch

```bash
# View Lambda logs
aws logs tail /aws/lambda/onewordaday-dev-word-generation --follow

# View API Gateway logs
aws logs tail /aws/apigateway/onewordaday-dev --follow
```

## Troubleshooting

### Lambda Function Not Found

```bash
# Check function exists
aws lambda list-functions | grep onewordaday

# If missing, rebuild and deploy
cd backend && npm run build && cd ../terraform && terraform apply
```

### API Gateway 403 Errors

```bash
# Check Cognito user pool
aws cognito-idp describe-user-pool --user-pool-id $USER_POOL_ID

# Verify API Gateway authorizer
aws apigateway get-authorizers --rest-api-id YOUR_API_ID
```

### DynamoDB Table Issues

```bash
# Check table exists
aws dynamodb list-tables | grep onewordaday

# Describe table
aws dynamodb describe-table --table-name onewordaday-dev-users
```

### EventBridge Not Triggering

```bash
# Check rule is enabled
aws events describe-rule --name onewordaday-dev-daily-word-generation

# Enable rule if disabled
aws events enable-rule --name onewordaday-dev-daily-word-generation
```

## Update and Maintenance

### Update Lambda Functions

```bash
cd backend
npm run build
cd ../terraform
terraform apply
```

### Update Infrastructure

```bash
cd terraform
# Edit .tf files
terraform plan
terraform apply
```

### Backup DynamoDB

```bash
# Enable point-in-time recovery (already enabled in Terraform)
aws dynamodb update-continuous-backups \
  --table-name onewordaday-dev-users \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Scale Resources

Edit `terraform/modules/lambda/main.tf`:
```hcl
resource "aws_lambda_function" "word_generation" {
  # Increase memory
  memory_size = 1024  # was 512
  
  # Increase timeout
  timeout = 600  # was 300
}
```

Then apply:
```bash
cd terraform
terraform apply
```

## Cost Optimization

### Enable DynamoDB DAX (Caching)

```bash
# Add to terraform/modules/dynamodb/main.tf
# See AWS documentation for DAX configuration
```

### Use Lambda Provisioned Concurrency

```hcl
resource "aws_lambda_provisioned_concurrency_config" "word_generation" {
  function_name                     = aws_lambda_function.word_generation.function_name
  provisioned_concurrent_executions = 1
  qualifier                         = aws_lambda_function.word_generation.version
}
```

### S3 Lifecycle Policies

Already configured in Terraform for intelligent tiering.

## Production Checklist

- [ ] Set environment to "prod" in terraform.tfvars
- [ ] Enable AWS WAF on API Gateway
- [ ] Configure custom domain name
- [ ] Set up SSL certificate
- [ ] Enable AWS X-Ray tracing
- [ ] Configure CloudWatch alerting
- [ ] Set up AWS Backup
- [ ] Enable AWS Config
- [ ] Review IAM permissions
- [ ] Enable CloudTrail logging
- [ ] Configure AWS Secrets Manager rotation
- [ ] Set up monitoring dashboard
- [ ] Document runbook procedures
- [ ] Test disaster recovery

## Cleanup

To destroy all infrastructure:

```bash
chmod +x scripts/destroy.sh
./scripts/destroy.sh
```

Or manually:

```bash
cd terraform
terraform destroy
```

**Note**: This will permanently delete all data!

## Next Steps

After successful deployment:

1. Test all features in the app
2. Monitor CloudWatch for errors
3. Review costs in AWS Cost Explorer
4. Set up production environment
5. Submit app to app stores
6. Set up CI/CD pipeline

---

For issues, check CloudWatch logs and review the main README.md troubleshooting section.

