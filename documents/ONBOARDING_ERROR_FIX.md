# Onboarding Error Fix

## Date: November 12, 2025

## Problem
`updateUserProfile` function was giving errors during onboarding.

## Root Causes Identified

### 1. TypeScript Type Mismatch ✅ FIXED
The function type definition was missing fields that onboarding was trying to send:
- ❌ Missing: `expoPushToken`
- ❌ Missing: `notificationPreferences.dailyWord.channels`
- ❌ Missing: `notificationPreferences.dailyWord.timezone`

### 2. Backend Lambda May Need Update ⚠️ ACTION REQUIRED
The `user-preferences` Lambda function needs to be deployed with the latest code changes.

---

## Fixes Applied

### 1. Updated Type Definition ✅

**File**: `lib/api.ts`

**Before:**
```typescript
updateUserProfile: async (profileData: any) => {
  // Accepts any data - no type checking
}
```

**After:**
```typescript
updateUserProfile: async (profileData: {
  name?: string;
  username?: string;
  email?: string;
  ageGroup?: string;
  context?: string;
  examPrep?: string;
  expoPushToken?: string;  // ✅ ADDED
  notificationPreferences?: {
    dailyWord?: {
      enabled?: boolean;
      time?: string;
      channels?: string[];   // ✅ ADDED
      timezone?: string;     // ✅ ADDED
    };
  };
}) => {
```

### 2. Added Validation ✅

```typescript
// Validate that we have at least some data
if (!profileData || Object.keys(profileData).length === 0) {
  throw new Error('Profile data cannot be empty');
}
```

### 3. Enhanced Error Logging ✅

```typescript
console.log('  - ERROR in updateUserProfile:');
console.log('    * Status:', error.response?.status);
console.log('    * Status Text:', error.response?.statusText);
console.log('    * Message:', error.response?.data?.message);
console.log('    * Error details:', error.response?.data?.error);
```

---

## Deployment Required

### Option 1: Quick Deploy (Recommended) ⚡

```powershell
# Deploy both frontend and backend
.\scripts\deploy.ps1 -Action quick
```

**This will:**
1. ✅ Deploy Lambda functions (backend)
2. ✅ Build and deploy web app (frontend)
3. ✅ Invalidate CloudFront cache

**Time:** ~2-3 minutes

---

### Option 2: Frontend Only (If Backend Already Updated)

```powershell
# Deploy web app only
.\scripts\deploy.ps1 -Action web
```

**Use if:**
- You only changed frontend code
- Lambda is already up to date

**Time:** ~1 minute

---

### Option 3: Full Deployment (If Infrastructure Changed)

```powershell
# Complete deployment
.\scripts\deploy.ps1 -Action full
```

**Use if:**
- First time deploying
- Infrastructure changes made

**Time:** ~5-10 minutes

---

## Testing After Deployment

### 1. Clear Browser Cache
```
Ctrl + Shift + R (Chrome/Firefox)
Cmd + Shift + R (Safari)
```

### 2. Test Sign Up Flow

```
1. Open web app URL
2. Sign up with new email
3. Verify email with code
4. Should auto-sign in
5. Complete onboarding (3 steps)
6. Should successfully save profile
7. Redirect to home (/(tabs))
```

### 3. Check Logs If Error Persists

```powershell
# Check Lambda logs
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

Look for:
- ✅ `[STEP 1] Handler invoked`
- ✅ `[STEP 2] Method: PUT`
- ✅ `[STEP 3] Extracted user ID`
- ✅ `[UPDATE] Starting update`
- ✅ `Successfully updated profile`

---

## Common Errors & Solutions

### Error: 401 Unauthorized

**Cause:** User not authenticated

**Solution:**
```typescript
// Check if user is signed in before onboarding
console.log('[AuthContext] User:', user);
```

**Fix:**
- Ensure auto-sign-in after email confirmation is working
- Check browser console for auth errors
- Try signing in manually before onboarding

---

### Error: 400 Bad Request

**Cause:** Invalid data format

**Solution:**
```typescript
// Check what data is being sent
console.log('Saving profile with data:', profileData);
```

**Fix:**
- Ensure all required fields are present
- Check data types match (string, number, boolean)
- Validate ageGroup, context are not empty

---

### Error: 500 Internal Server Error

**Cause:** Lambda function error

**Solution:**
```powershell
# Check Lambda logs
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

**Fix:**
- Redeploy Lambda: `.\scripts\deploy.ps1 -Action lambda`
- Check DynamoDB permissions
- Verify table exists

---

### Error: Network Error / Timeout

**Cause:** API endpoint not reachable or slow

**Solution:**
1. Check API endpoint in environment:
   ```javascript
   console.log(process.env.EXPO_PUBLIC_API_ENDPOINT);
   ```

2. Test API directly:
   ```powershell
   # Get API URL
   .\scripts\deploy.ps1 -Action urls
   
   # Test endpoint
   curl https://your-api-url/health
   ```

**Fix:**
- Verify API Gateway is deployed
- Check CloudFront/API Gateway status
- Increase timeout if needed

---

## Debugging Steps

### 1. Check Authentication Status

**In browser console:**
```javascript
// Should show user info
console.log('[AuthContext] User:', user);
```

**Expected:**
```javascript
{
  userId: "abc-123-def",
  username: "johndoe",
  name: "John Doe",  // ✅ From Cognito
  email: "john@example.com"
}
```

---

### 2. Check Profile Data Being Sent

**In browser console during onboarding:**
```javascript
Saving profile with data: {
  ageGroup: "adult",
  context: "professional",
  examPrep: "",
  expoPushToken: "",
  notificationPreferences: { ... },
  email: "john@example.com",
  name: "John Doe",
  username: "John Doe"
}
```

---

### 3. Check API Request

**In browser console:**
```javascript
API - UPDATE USER PROFILE
  - Endpoint: PUT /user/profile
  - Payload keys: ["ageGroup", "context", "email", "name", ...]
  - Sending request...
```

**Success:**
```javascript
  - Response received:
    * Status: 200
    * Message: "Profile updated successfully"
    * Profile updated: true
```

**Error:**
```javascript
  - ERROR in updateUserProfile:
    * Status: 401  // ← Check this code
    * Message: "Unauthorized"
```

---

### 4. Check Lambda Logs

```powershell
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

**Look for:**
```
[STEP 1] Handler invoked - Method: PUT, Path: /user/profile
[STEP 2] Raw event body length: 245
[STEP 3] Parsed body keys: ageGroup, context, email, name
[STEP 4] Cognito authorizer present: true
[STEP 5] Extracted user ID: abc-123-def
[UPDATE] Starting profile update
[UPDATE] Update expression: SET #n = :name, #e = :email, ...
[UPDATE] Successfully updated profile
```

---

## Data Flow

```
User completes onboarding steps
  ↓
Clicks "Complete Setup"
  ↓
onboarding.tsx collects data:
  - ageGroup (from step 1)
  - context (from step 2)
  - examPrep (from step 3, if student)
  - user.name (from AuthContext)
  - user.email (from AuthContext)
  - expoPushToken (if mobile)
  ↓
Calls api.updateUserProfile(profileData)
  ↓
Creates authenticated API client (with Bearer token)
  ↓
Sends PUT /user/profile
  ↓
API Gateway → Lambda Authorizer (validates token)
  ↓
user-preferences Lambda function
  ↓
Updates DynamoDB Users table
  ↓
Returns success response
  ↓
Redirects to /(tabs)
```

---

## Quick Checklist

Before onboarding works, ensure:

- ✅ User signs up successfully
- ✅ User confirms email with code
- ✅ User auto-signs in after confirmation
- ✅ AuthContext has user.name and user.email
- ✅ API endpoint is configured
- ✅ Lambda function is deployed
- ✅ DynamoDB table exists
- ✅ Cognito authorizer is working
- ✅ Frontend code is deployed

---

## Deploy Now

```powershell
# Quick deploy (recommended)
.\scripts\deploy.ps1 -Action quick

# Then clear browser cache and test
```

---

## Verification Commands

```powershell
# 1. Check deployment status
.\scripts\deploy.ps1 -Action status

# 2. Get web app URL
.\scripts\deploy.ps1 -Action urls

# 3. Check Lambda logs after testing
.\scripts\deploy.ps1 -Action logs -Function user-preferences

# 4. Clean up test user if needed
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"
```

---

## Status

✅ **TypeScript types**: Fixed  
✅ **Validation**: Added  
✅ **Error logging**: Enhanced  
⚠️ **Deployment**: Required  
📋 **Testing**: Pending  

---

## Next Steps

1. **Deploy the changes:**
   ```powershell
   .\scripts\deploy.ps1 -Action quick
   ```

2. **Clear browser cache** (Ctrl + Shift + R)

3. **Test sign up flow** with new email

4. **If error persists:**
   - Check browser console logs
   - Check Lambda logs
   - Share specific error message

---

**The TypeScript error is now fixed. Deploy and test!** ✅

