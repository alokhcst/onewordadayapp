# One Word A Day - Quick Start Guide

## 🚀 Post-Deployment Steps

After running `terraform apply` successfully, follow these steps to get your app running.

---

## Step 1: Get Terraform Outputs

```powershell
# From terraform directory
terraform output
```

You'll get:
```
api_gateway_url = "https://xyz123.execute-api.us-east-1.amazonaws.com/production"
cloudfront_domain = "d1234567890.cloudfront.net"
cognito_client_id = "abc123xyz..."
cognito_user_pool_id = "us-east-1_AbC123"
```

---

## Step 2: Create Frontend .env File

**From project root:**

```powershell
cd ..  # if still in terraform directory

# Create .env file
@"
EXPO_PUBLIC_USER_POOL_ID=$(terraform -chdir=terraform output -raw cognito_user_pool_id)
EXPO_PUBLIC_USER_POOL_CLIENT_ID=$(terraform -chdir=terraform output -raw cognito_client_id)
EXPO_PUBLIC_API_ENDPOINT=$(terraform -chdir=terraform output -raw api_gateway_url)
"@ | Out-File -FilePath .env -Encoding utf8
```

**Or manually create `.env` file:**

```env
EXPO_PUBLIC_USER_POOL_ID=us-east-1_AbC123
EXPO_PUBLIC_USER_POOL_CLIENT_ID=your-client-id
EXPO_PUBLIC_API_ENDPOINT=https://your-api.execute-api.us-east-1.amazonaws.com/production
```

---

## Step 3: Populate Word Bank

```powershell
cd backend
$env:WORD_BANK_TABLE="onewordaday-production-word-bank"
node populate-word-bank.js
```

✅ Expected output:
```
Populating word bank table: onewordaday-production-word-bank
Adding 10 words...

✓ Added: serendipity
✓ Added: ephemeral
✓ Added: resilient
...

========================================
✓ Successfully added: 10 words
========================================
```

---

## Step 4: Verify SES Email (Important!)

**For email notifications to work:**

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Click **"Verified identities"**
3. Click **"Create identity"**
4. Select **"Email address"**
5. Enter: `noreply@yourdomain.com`
6. Click **"Create identity"**
7. **Check your email** and click the verification link

> 💡 **Tip**: Use your personal email for testing (e.g., `yourname@gmail.com`)

---

## Step 5: Install Frontend Dependencies

```powershell
cd ..  # back to project root
npm install
```

---

## Step 6: Start the App!

```powershell
npx expo start
```

You'll see:
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**On your phone:**
- **iOS**: Open Camera app → Scan QR code
- **Android**: Open Expo Go app → Scan QR code

---

## 📱 Using the App

### First Time Setup:

1. **Sign Up**
   - Email & password
   - Or skip Google OAuth for now

2. **Complete Onboarding**
   - Select your age group
   - Choose your context (School, Corporate, etc.)
   - Allow notifications

3. **Get Your First Word**
   - Wait a moment for word generation
   - Or manually trigger it (see troubleshooting)

---

## 🔧 Troubleshooting

### No Word Appearing?

The word generation runs daily at midnight UTC. To test immediately:

```powershell
# Manually invoke word generation Lambda
aws lambda invoke `
  --function-name onewordaday-production-word-generation `
  --payload '{}' `
  response.json

# Check response
Get-Content response.json
```

### API Errors (401/403)?

```powershell
# Verify Cognito configuration
aws cognito-idp describe-user-pool `
  --user-pool-id $(terraform -chdir=terraform output -raw cognito_user_pool_id)
```

### DynamoDB Errors?

```powershell
# Check tables exist
aws dynamodb list-tables
```

### Check Lambda Logs

```powershell
# View logs for word generation
aws logs tail /aws/lambda/onewordaday-production-word-generation --follow

# View logs for API calls
aws logs tail /aws/lambda/onewordaday-production-get-todays-word --follow
```

---

## 🎯 Quick Commands Reference

### Check Infrastructure Status

```powershell
cd terraform
terraform show
```

### View CloudWatch Dashboard

```powershell
# Open in browser
start "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:"
```

### Test API Manually

```powershell
# Get your ID token from the app (check logs)
$TOKEN = "your-id-token-here"

# Test get today's word
curl -H "Authorization: Bearer $TOKEN" `
  $(terraform -chdir=terraform output -raw api_gateway_url)/word/today
```

### Add More Words

```powershell
cd backend
$env:WORD_BANK_TABLE="onewordaday-production-word-bank"
node populate-word-bank.js
```

---

## 🌟 Optional: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URIs:
   ```
   onewordadayapp://
   https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
4. Update `terraform/terraform.tfvars`:
   ```hcl
   google_client_id = "your-client-id.apps.googleusercontent.com"
   google_client_secret = "your-client-secret"
   ```
5. Re-deploy:
   ```powershell
   cd terraform
   terraform apply
   ```

---

## 📊 Monitoring & Logs

### View All Logs

```powershell
# Lambda functions
aws logs tail /aws/lambda/onewordaday-production-word-generation --follow

# API Gateway
aws logs tail /aws/apigateway/onewordaday-production --follow
```

### Check DynamoDB Items

```powershell
# Count words in bank
aws dynamodb scan `
  --table-name onewordaday-production-word-bank `
  --select COUNT

# View users
aws dynamodb scan `
  --table-name onewordaday-production-users `
  --max-items 5
```

### Monitor Costs

```powershell
# Open AWS Cost Explorer
start "https://console.aws.amazon.com/cost-management/home"
```

---

## 🧹 Clean Up (When Done Testing)

**⚠️ WARNING: This will delete everything!**

```powershell
cd terraform
terraform destroy
```

Type `yes` when prompted.

---

## 💡 Pro Tips

1. **Development vs Production**
   - Change `environment = "dev"` in `terraform.tfvars`
   - This creates separate resources with `-dev` suffix

2. **Cost Savings**
   - AWS Free Tier covers most usage for testing
   - Watch out for SMS costs (expensive!)
   - Use push notifications primarily

3. **Debugging**
   - Enable X-Ray tracing (already configured)
   - Check CloudWatch Logs frequently
   - Use `terraform output` to get resource names

4. **Security**
   - Never commit `.env` or `terraform.tfvars` with secrets
   - Rotate credentials regularly
   - Enable MFA on AWS account

---

## 📚 Next Steps

- [ ] Test user registration & login
- [ ] Verify daily word appears
- [ ] Test feedback submission
- [ ] Check notification delivery
- [ ] Review CloudWatch metrics
- [ ] Set up CloudWatch alarms
- [ ] Configure custom domain (optional)
- [ ] Submit to app stores (optional)

---

## 🆘 Need Help?

1. **Check logs first**: Most issues show up in CloudWatch
2. **Verify AWS credentials**: `aws sts get-caller-identity`
3. **Check Terraform state**: `terraform show`
4. **Review the main README.md** for detailed documentation

---

## 🎉 You're All Set!

Your One Word A Day app is now running on AWS with:
- ✅ Serverless architecture
- ✅ Automatic scaling
- ✅ Secure authentication
- ✅ Multi-channel notifications
- ✅ Full monitoring

**Enjoy building your vocabulary! 📚✨**

