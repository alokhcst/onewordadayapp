# User Name Display Fix - Load from Cognito userAttributes

## Date: November 12, 2025

## Problem
The user's display name was not being properly loaded from Cognito user attributes. Instead, the app was showing the username or UUID in places where the user's actual name should appear.

## Solution
Updated the authentication flow to fetch user attributes from Cognito and extract the `name` field, then use it throughout the application.

---

## Changes Made

### 1. Updated User Interface in AuthContext ✅

**File**: `contexts/AuthContext.tsx`

**Added** `name` field to the User interface:

```typescript
interface User {
  userId: string;
  username: string;
  name?: string;  // Display name from Cognito userAttributes
  email?: string;
}
```

### 2. Enhanced getCurrentAuthUser Function ✅

**File**: `lib/auth.ts`

**Changes**:
1. Added `fetchUserAttributes` to imports
2. Updated `getCurrentAuthUser()` to fetch user attributes from Cognito
3. Extract name from multiple possible attribute fields

**Priority for name**:
1. `attributes.name`
2. `attributes.given_name`
3. `attributes.preferred_username`
4. `user.username` (fallback)

**Code Added**:
```typescript
// Fetch user attributes to get name and email
const attributes = await fetchUserAttributes();

// Build enhanced user object
const enhancedUser = {
  ...user,
  name: attributes.name || attributes.given_name || attributes.preferred_username || user.username,
  email: attributes.email || user.signInDetails?.loginId,
};
```

### 3. Updated AuthContext to Use Name ✅

**File**: `contexts/AuthContext.tsx`

**Changes**:
- Updated `checkAuthStatus()` to extract and store `name` from the user object
- Added logging to show what name is being loaded
- Set `user.name` in the state

**Code**:
```typescript
setUser({
  userId: currentUser.userId,
  username: currentUser.username,
  name: currentUser.name,  // Display name from userAttributes
  email: currentUser.email || currentUser.signInDetails?.loginId || currentUser.username,
});
```

### 4. Updated Onboarding to Use Name ✅

**File**: `app/(auth)/onboarding.tsx`

**Changes**:
- Use `user?.name` from auth context when saving profile
- Set both `name` and `username` to the same value

**Code**:
```typescript
if (user?.name) {
  profileData.name = user.name;  // Use display name from Cognito
  profileData.username = user.name;  // Set username same as name
} else if (user?.username) {
  profileData.username = user.username;
}
```

### 5. Updated Profile Screen to Display Name ✅

**File**: `app/(tabs)/profile.tsx`

**Changes**:
- Prioritize `user?.name` from auth context over profile data
- Show name from Cognito userAttributes as the primary display name

**Priority Chain**:
```typescript
const finalName = user?.name || response.profile?.name || user?.username || 'User';
const finalEmail = user?.email || response.profile?.email || user?.username || '';
```

---

## Data Flow

### Authentication Flow:
```
1. User Signs In
   ↓
2. authSignIn() called
   ↓
3. checkAuthStatus() called
   ↓
4. getCurrentAuthUser() called
   ↓
5. getCurrentUser() - gets basic user info
   ↓
6. fetchUserAttributes() - gets full user attributes
   ↓
7. Extract name from attributes.name
   ↓
8. Store in AuthContext user object
   ↓
9. Available throughout app as user.name
```

### Display Flow:
```
AuthContext.user.name
   ↓
Used in:
- Profile Screen (display name)
- Onboarding (save to profile)
- Any component that needs user's display name
```

---

## Logging Added

### In `lib/auth.ts` - `getCurrentAuthUser()`:
```
- Fetching user attributes...
- User attributes:
  * name: "John Doe"
  * email: "john@example.com"
  * given_name: "John"
  * family_name: "Doe"
  * preferred_username: "johndoe"
- Enhanced user object:
  * userId: "uuid-v4-string"
  * username: "johndoe"
  * name (display): "John Doe"
  * email: "john@example.com"
```

### In `contexts/AuthContext.tsx` - `checkAuthStatus()`:
```
[AuthContext] Checking auth status...
[AuthContext] User found: {
  userId: "uuid-v4-string",
  username: "johndoe",
  name: "John Doe",
  email: "john@example.com"
}
```

### In `app/(tabs)/profile.tsx` - `loadProfile()`:
```
- Auth context user: {
  username: "johndoe",
  name: "John Doe",
  email: "john@example.com",
  userId: "uuid-v4-string"
}
- Determining display values:
  * user.name: "John Doe"
  * profile.name: "John Doe"
  * user.username: "johndoe"
  * finalName: "John Doe"
  * finalEmail: "john@example.com"
```

---

## Testing Steps

### 1. Test with New User
```bash
# Start the dev server
npm run web

# Sign up a new user
# - Enter name: "John Doe"
# - Enter email: "john@example.com"
# - Enter password

# Confirm email
# Complete onboarding
# Check profile page - should show "John Doe" (not UUID or username)
```

### 2. Test with Existing User
```bash
# Sign in with existing credentials
# Check profile page
# Verify display name shows actual name, not UUID
```

### 3. Check Console Logs
```javascript
// Look for these logs in browser console:
[AuthContext] User found: { name: "John Doe", ... }
```

---

## Benefits

✅ **Proper Name Display**: Shows user's actual name from Cognito  
✅ **Multiple Fallbacks**: Tries name, given_name, preferred_username  
✅ **Consistent**: Name loaded once in AuthContext, available everywhere  
✅ **Comprehensive Logging**: Easy to debug name loading issues  
✅ **Type Safe**: TypeScript interface updated with name field  

---

## Key Components Updated

| Component | File | Change |
|-----------|------|--------|
| User Interface | `contexts/AuthContext.tsx` | Added `name?: string` field |
| Auth Function | `lib/auth.ts` | Fetch and return userAttributes.name |
| Auth Context | `contexts/AuthContext.tsx` | Store name in user state |
| Onboarding | `app/(auth)/onboarding.tsx` | Use user.name when saving profile |
| Profile Screen | `app/(tabs)/profile.tsx` | Display user.name as primary name |

---

## Name Priority Hierarchy

### In Profile Display:
1. **`user.name`** - From Cognito userAttributes (highest priority)
2. **`profile.name`** - From DynamoDB profile table
3. **`user.username`** - Cognito username
4. **`'User'`** - Final fallback

### In Cognito Attributes:
1. **`attributes.name`** - Full name
2. **`attributes.given_name`** - First name
3. **`attributes.preferred_username`** - Preferred username
4. **`user.username`** - Cognito username (fallback)

---

## Deployment

### Frontend Changes Only (No Lambda Changes Needed)

The frontend automatically uses the new code once reloaded:

```bash
# If using development server
# Just refresh the browser - changes are hot-reloaded

# If deploying to production
npm run build:web
./scripts/deploy-web.ps1
```

---

## Verification

After deployment, verify in browser console:

```javascript
// Should see logs like:
[AuthContext] User found: {
  userId: "abc-123-def",
  username: "johndoe",
  name: "John Doe",  // ✅ Actual name
  email: "john@example.com"
}
```

And on the Profile screen, you should see:
- **Name**: John Doe (not UUID)
- **Email**: john@example.com

---

## Status

✅ **Code Changes**: Complete  
✅ **Linting**: No errors  
✅ **Type Safety**: TypeScript interfaces updated  
✅ **Logging**: Comprehensive debugging logs added  
✅ **Ready for**: Testing and deployment  

---

## Related Files

- `contexts/AuthContext.tsx` - User state management
- `lib/auth.ts` - Authentication functions
- `app/(auth)/onboarding.tsx` - New user setup
- `app/(tabs)/profile.tsx` - Profile display
- `lib/aws-config.ts` - Amplify configuration (no changes needed)

