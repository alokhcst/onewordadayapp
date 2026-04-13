# App Folder Code Documentation

This document explains what each line of code does in the app folder section of the One Word A Day application.

## Files Documented

I've added comprehensive line-by-line comments to the following files:

### 1. `app/(auth)/confirm.tsx` ✅
**Purpose:** Email verification screen where users enter the 6-digit code sent to their email.

**Key Features:**
- Validates 6-digit verification code
- Auto-signs in user after successful confirmation (if password available)
- Handles edge cases (already confirmed, expired code, invalid code)
- Resend code functionality
- Platform-specific UI (web vs mobile)

**Main Functions:**
- `handleConfirm()` - Verifies the code and signs user in
- `handleResendCode()` - Resends verification code to email

---

### 2. `app/(auth)/_layout.tsx` ✅
**Purpose:** Navigation layout for the authentication flow.

**Key Features:**
- Defines Stack navigator for auth screens
- Configures screen headers and back buttons
- Groups all auth-related screens together

**Screens Configured:**
- `welcome` - Welcome screen (no header)
- `signin` - Sign in screen
- `signup` - Sign up screen
- `confirm` - Email confirmation screen
- `onboarding` - User onboarding screen (no header)

---

### 3. `app/_layout.tsx` ✅
**Purpose:** Root layout that wraps the entire application.

**Key Features:**
- Configures AWS Amplify (Cognito, API Gateway)
- Provides global context (Auth, Toast)
- Handles splash screen
- Applies theme (dark/light mode)
- Sets up main navigation structure

**Providers (outermost to innermost):**
1. `ToastProvider` - Toast notifications
2. `AuthProvider` - Authentication state
3. `ThemeProvider` - Dark/light theme
4. `Stack` - Main navigation

---

### 4. `app/(auth)/signin.tsx` ✅
**Purpose:** Sign-in screen for existing users.

**Key Features:**
- Email/password authentication
- Google OAuth sign-in
- Auto-redirects if already authenticated
- Form validation
- Loading states for both sign-in methods

**Main Functions:**
- `handleSignIn()` - Email/password sign-in
- `handleGoogleSignIn()` - Google OAuth sign-in
- `useEffect()` - Auto-redirect if authenticated

**UI Components:**
- Email input field
- Password input field (secure)
- Sign-in button
- Google sign-in button
- Link to sign-up screen

---

### 5. `app/(tabs)/index.tsx` ✅ (Partially Documented)
**Purpose:** Today's Word screen - main screen showing the daily word.

**Key Features:**
- Fetches today's word from API
- Displays word details (definition, examples, synonyms, antonyms)
- Text-to-speech functionality
- Skip word and get new one
- Navigate to feedback screen

**Main Functions:**
- `loadTodaysWord()` - Fetches word from API
- `handleSpeak()` - Text-to-speech for word pronunciation
- `handleFeedback()` - Navigate to feedback screen
- `handleNextWord()` - Skip current word and get new one

**UI States:**
- Loading state (shows spinner)
- Empty state (no word available)
- Word display state (shows full word details)

---

## Code Structure Overview

### Component Structure Pattern

Most components follow this pattern:

```typescript
// 1. Imports
import { ... } from '...';

// 2. Component function
export default function ComponentName() {
  // 3. Hooks (router, context, state)
  const router = useRouter();
  const { ... } = useAuth();
  const [state, setState] = useState(...);
  
  // 4. Effects (side effects)
  useEffect(() => { ... }, []);
  
  // 5. Handler functions
  const handleAction = async () => { ... };
  
  // 6. JSX return
  return ( ... );
  
  // 7. Styles
  const styles = StyleSheet.create({ ... });
}
```

### State Management

- **Local State:** Uses `useState` for component-specific state (form inputs, loading states)
- **Global State:** Uses Context API (`AuthContext`, `ToastContext`) for app-wide state
- **Navigation State:** Managed by Expo Router automatically

### Error Handling Pattern

```typescript
try {
  // API call or async operation
  await someAsyncFunction();
} catch (error: any) {
  // Log error for debugging
  console.error('Error:', error);
  // Show user-friendly error message
  showError(error.message || 'Default error message');
} finally {
  // Always reset loading state
  setIsLoading(false);
}
```

### Navigation Patterns

- **`router.push()`** - Navigate to new screen (can go back)
- **`router.replace()`** - Navigate and replace current screen (can't go back)
- **`router.back()`** - Go back to previous screen

### API Integration

All API calls use the `api` client from `@/lib/api`:
- `api.getTodaysWord()` - Get today's word
- `api.submitFeedback()` - Submit user feedback
- `api.getUserProfile()` - Get user profile
- etc.

---

## Key Concepts Explained

### 1. Controlled Components
Input fields are "controlled" - their value is bound to React state:
```typescript
<TextInput
  value={email}           // Bound to state
  onChangeText={setEmail} // Updates state when user types
/>
```

### 2. Loading States
Prevents double-submission and shows user feedback:
```typescript
const [isLoading, setIsLoading] = useState(false);
// ... in handler
setIsLoading(true);
try {
  await someAction();
} finally {
  setIsLoading(false);
}
```

### 3. Conditional Rendering
Show different UI based on state:
```typescript
{isLoading ? (
  <ActivityIndicator />
) : (
  <WordContent />
)}
```

### 4. Platform-Specific Code
Different behavior for web vs mobile:
```typescript
if (Platform.OS === 'web') {
  // Web-specific code
} else {
  // Mobile-specific code
}
```

---

## Next Steps

To add comments to remaining files:

1. **`app/(auth)/signup.tsx`** - User registration screen
2. **`app/(auth)/onboarding.tsx`** - User onboarding/profile setup
3. **`app/(auth)/welcome.tsx`** - Welcome/landing screen
4. **`app/(tabs)/history.tsx`** - Word history screen
5. **`app/(tabs)/profile.tsx`** - User profile screen
6. **`app/feedback.tsx`** - Feedback submission screen
7. **`app/(tabs)/_layout.tsx`** - Tabs navigation layout

---

## How to Read the Comments

Each file now has comments explaining:
- **What each import does** - Why it's needed
- **What each variable/state does** - Its purpose
- **What each function does** - Step-by-step logic
- **What each UI component does** - Its role in the UI
- **What each style does** - Visual appearance

The comments are written to be:
- ✅ Clear and concise
- ✅ Explain the "why" not just the "what"
- ✅ Helpful for new developers
- ✅ Non-intrusive (don't clutter the code)

---

## Questions?

If you need clarification on any part of the code:
1. Check the inline comments in the file
2. Refer to this documentation
3. Check the React Native/Expo Router documentation
4. Review the AWS Amplify documentation for auth patterns

