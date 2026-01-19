# Google OAuth Setup - Fixed

## Issue
When clicking "Sign in with Google", the app was trying to access:
```
onewordaday-production.auth.us-east-1.amazoncognito.com
```

This resulted in `DNS_PROBE_FINISHED_NXDOMAIN` error because the Cognito User Pool domain wasn't configured.

## Solution

### 1. Added Cognito User Pool Domain
Added the following to `terraform/modules/cognito/main.tf`:

```hcl
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.name_prefix}"
  user_pool_id = aws_cognito_user_pool.main.id
}
```

### 2. Deployed Configuration
- Created Cognito domain: `onewordaday-production`
- Full domain URL: `https://onewordaday-production.auth.us-east-1.amazoncognito.com`
- Imported existing Google Identity Provider into Terraform state

### 3. Google OAuth Configuration

#### Current Setup:
- **User Pool ID**: `us-east-1_vyrvuvu36`
- **Domain**: `onewordaday-production`
- **Full Domain URL**: `https://onewordaday-production.auth.us-east-1.amazoncognito.com`
- **Identity Provider**: Google
- **Client ID**: Configured in terraform.tfvars
- **Client Secret**: Configured in terraform.tfvars

#### OAuth Flows Enabled:
- Authorization Code
- Implicit

#### OAuth Scopes:
- email
- openid
- profile

#### Callback URLs:
- `onewordadayapp://` (Mobile)
- `exp://localhost:8081` (Expo Development)
- `http://localhost:19006` (Web Development)
- `http://localhost:19006/` (Web Development)
- CloudFront URL
- S3 Website URL
- Custom domain (if configured)

## How Google Sign-In Works

### Flow:
1. User clicks "Sign in with Google" in the app
2. App redirects to Cognito Hosted UI at `onewordaday-production.auth.us-east-1.amazoncognito.com`
3. Cognito shows Google sign-in button
4. User authenticates with Google
5. Google redirects back to Cognito
6. Cognito creates/updates user in User Pool
7. User is redirected back to app with tokens

### Attribute Mapping:
- `email` → Cognito email
- `name` → Cognito name  
- `sub` (Google user ID) → Cognito username

## Testing

### Prerequisites:
1. Google OAuth Client ID and Secret must be configured in `terraform.tfvars`
2. Authorized redirect URIs must be configured in Google Cloud Console:
   - `https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

### Steps to Test:
1. Open the app in browser
2. Click "Sign in with Google"
3. Should redirect to Cognito Hosted UI
4. Click Google button
5. Sign in with Google account
6. Should redirect back to app with successful authentication

## Troubleshooting

### DNS Error Still Appears:
- Clear browser cache and cookies
- Try in incognito/private mode
- Verify domain exists: `nslookup onewordaday-production.auth.us-east-1.amazoncognito.com`

### Google Sign-In Button Not Appearing:
- Check Google Client ID and Secret are configured
- Verify Google Identity Provider is enabled in Cognito
- Check browser console for errors

### Redirect URI Mismatch:
- Ensure Google Cloud Console has the correct redirect URI
- URI must match: `https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

## Google Cloud Console Configuration

### Required Settings:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Select your OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   ```
   https://onewordaday-production.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
4. Add Authorized JavaScript origins:
   ```
   https://onewordaday-production.auth.us-east-1.amazoncognito.com
   ```

## Status
✅ Cognito domain configured
✅ Google Identity Provider imported
✅ OAuth flows enabled
✅ Callback URLs configured
✅ Ready for testing

## Next Steps
1. Verify Google Cloud Console has correct redirect URI
2. Test Google sign-in from the app
3. Refresh browser and try signing in with Google
