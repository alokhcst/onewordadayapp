import { signIn as amplifySignIn, confirmSignUp, fetchAuthSession, fetchUserAttributes, getCurrentUser, resendSignUpCode, signInWithRedirect, signOut, signUp } from 'aws-amplify/auth';
import * as SecureStore from 'expo-secure-store';

const getAuthErrorDetails = (error: any) => ({
  name: error?.name || 'Unknown',
  message: error?.message || 'Unknown error',
  code: error?.code,
  status: error?.$metadata?.httpStatusCode,
});

const getSignInUserMessage = (error: any) => {
  const { name, message, status } = getAuthErrorDetails(error);
  const normalized = `${name} ${message}`.toLowerCase();

  if (normalized.includes('usernotfound') || normalized.includes('user does not exist')) {
    return 'No account found for this email. Please sign up first.';
  }
  if (normalized.includes('notauthorized') || normalized.includes('incorrect username or password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (normalized.includes('usernotconfirmed') || normalized.includes('user is not confirmed')) {
    return 'Your email is not verified yet. Please confirm your account.';
  }
  if (normalized.includes('passwordresetrequired')) {
    return 'Password reset required. Please reset your password.';
  }
  if (normalized.includes('limitexceeded') || normalized.includes('too many') || status === 429) {
    return 'Too many attempts. Please wait a bit and try again.';
  }
  if (normalized.includes('network') || normalized.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (normalized.includes('invalidparameter')) {
    return 'Invalid sign-in request. Please check your email and try again.';
  }
  if (name === 'Unknown') {
    return 'Sign-in failed due to configuration or service error. Please try again later.';
  }

  return 'Unable to sign in. Please try again.';
};

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export const authSignUp = async ({ email, password, name }: SignUpParams) => {
  console.log('========================================');
  console.log('AUTH - SIGN UP');
  console.log('========================================');
  console.log('  - Email:', email);
  console.log('  - Name:', name);
  console.log('  - Password length:', password?.length || 0);
  
  try {
    console.log('  - Calling Cognito signUp...');
    
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    });

    console.log('  - Sign up successful:');
    console.log('    * isSignUpComplete:', isSignUpComplete);
    console.log('    * userId:', userId);
    console.log('    * nextStep:', nextStep?.signUpStep);
    console.log('========================================\n');

    return {
      success: true,
      isSignUpComplete,
      userId,
      nextStep,
    };
  } catch (error: any) {
    console.log('  - ERROR in authSignUp:');
    console.error('    * Error name:', error.name);
    console.error('    * Error message:', error.message);
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(error.message || 'Failed to sign up');
  }
};

/**
 * Confirm sign up with verification code
 */
export const authConfirmSignUp = async (email: string, code: string) => {
  console.log('========================================');
  console.log('AUTH - CONFIRM SIGN UP');
  console.log('========================================');
  console.log('  - Email:', email);
  console.log('  - Code length:', code?.length || 0);
  
  try {
    console.log('  - Calling Cognito confirmSignUp...');
    
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });

    console.log('  - Confirmation successful:');
    console.log('    * isSignUpComplete:', isSignUpComplete);
    console.log('    * nextStep:', nextStep?.signUpStep);
    console.log('========================================\n');

    return {
      success: true,
      isSignUpComplete,
      nextStep,
    };
  } catch (error: any) {
    console.log('  - ERROR in authConfirmSignUp:');
    console.error('    * Error name:', error.name);
    console.error('    * Error message:', error.message);
    
    // If user is already confirmed, that's actually success
    if (error.message?.includes('Current status is CONFIRMED') || 
        error.name === 'NotAuthorizedException') {
      console.log('    * User already confirmed - treating as success');
      console.log('========================================\n');
      return {
        success: true,
        isSignUpComplete: true,
        nextStep: null,
        alreadyConfirmed: true,
      };
    }
    
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(error.message || 'Failed to confirm sign up');
  }
};

/**
 * Resend confirmation code
 */
export const authResendSignUpCode = async (email: string) => {
  console.log('========================================');
  console.log('AUTH - RESEND CONFIRMATION CODE');
  console.log('========================================');
  console.log('  - Email:', email);
  
  try {
    console.log('  - Calling Cognito resendSignUpCode...');
    
    await resendSignUpCode({
      username: email,
    });
    
    console.log('  - Code resent successfully');
    console.log('========================================\n');
    
    return { success: true };
  } catch (error: any) {
    console.log('  - ERROR in authResendSignUpCode:');
    console.error('    * Error name:', error.name);
    console.error('    * Error message:', error.message);
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(error.message || 'Failed to resend code');
  }
};

/**
 * Sign in with Google (Federated Sign In)
 */
export const signInWithGoogle = async () => {
  console.log('========================================');
  console.log('AUTH - SIGN IN WITH GOOGLE');
  console.log('========================================');
  console.log('  - Initiating Google OAuth redirect...');
  
  try {
    await signInWithRedirect({ provider: 'Google' });
    console.log('  - Redirect initiated');
    console.log('========================================\n');
  } catch (error: any) {
    console.log('  - ERROR in signInWithGoogle:');
    console.error('    * Error name:', error.name);
    console.error('    * Error message:', error.message);
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

/**
 * Sign in a user
 */
export const authSignIn = async ({ email, password }: SignInParams) => {
  console.log('========================================');
  console.log('AUTH - SIGN IN');
  console.log('========================================');
  console.log('  - Email:', email);
  console.log('  - Password length:', password?.length || 0);
  
  try {
    // Check if user is already signed in first
    console.log('  - Checking for existing session...');
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        console.log('  - User already signed in:');
        console.log('    * userId:', currentUser.userId);
        console.log('    * username:', currentUser.username);
        console.log('========================================\n');
        
        // User already signed in, return success
        return {
          success: true,
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' },
        };
      }
    } catch (checkError) {
      console.log('  - No existing session found');
    }

    console.log('  - Calling Cognito signIn...');
    
    const { isSignedIn, nextStep } = await amplifySignIn({
      username: email,
      password,
    });

    console.log('  - Sign in response:');
    console.log('    * isSignedIn:', isSignedIn);
    console.log('    * nextStep:', nextStep?.signInStep);

    if (isSignedIn) {
      console.log('  - Sign in successful!');
      
      // Store credentials securely (skip on web where SecureStore isn't available)
      try {
        await SecureStore.setItemAsync('userEmail', email);
        console.log('  - Credentials stored in SecureStore');
      } catch (secureStoreError) {
        console.log('  - SecureStore not available (web platform)');
      }
    }

    console.log('========================================\n');

    return {
      success: true,
      isSignedIn,
      nextStep,
    };
  } catch (error: any) {
    console.log('  - ERROR in authSignIn:');
    const details = getAuthErrorDetails(error);
    console.error('    * Error name:', details.name);
    console.error('    * Error message:', details.message);
    if (details.code) {
      console.error('    * Error code:', details.code);
    }
    if (details.status) {
      console.error('    * HTTP status:', details.status);
    }
    
    // If error is about already signed in user, treat as success
    if (details.message?.includes('already a signed in user') || 
        details.message?.includes('already signed in') ||
        details.name === 'UserAlreadyAuthenticatedException') {
      console.log('    * User already authenticated - treating as success');
      console.log('========================================\n');
      return {
        success: true,
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      };
    }
    
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(getSignInUserMessage(error));
  }
};

/**
 * Sign out the current user
 */
export const authSignOut = async () => {
  console.log('========================================');
  console.log('AUTH - SIGN OUT');
  console.log('========================================');
  
  try {
    console.log('  - Calling Cognito signOut...');
    await signOut();
    console.log('  - Sign out successful');
    
    // Only delete SecureStore item if not on web
    try {
      await SecureStore.deleteItemAsync('userEmail');
      console.log('  - Credentials cleared from SecureStore');
    } catch (secureStoreError) {
      console.log('  - SecureStore not available (web platform)');
    }
    
    console.log('========================================\n');
    return { success: true };
  } catch (error: any) {
    console.log('  - ERROR in authSignOut:');
    console.error('    * Error name:', error.name);
    console.error('    * Error message:', error.message);
    console.error('    * Full error:', error);
    console.log('========================================\n');
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Get current authenticated user with attributes
 */
export const getCurrentAuthUser = async () => {
  console.log('========================================');
  console.log('AUTH - GET CURRENT USER');
  console.log('========================================');
  
  try {
    console.log('  - Calling Cognito getCurrentUser...');
    const user = await getCurrentUser();
    
    console.log('  - User found:');
    console.log('    * userId:', user.userId);
    console.log('    * username:', user.username);
    console.log('    * signInDetails:', user.signInDetails?.loginId);
    
    // Fetch user attributes to get name and email
    console.log('  - Fetching user attributes...');
    let attributes: any = {};
    try {
      attributes = await fetchUserAttributes();
      
      console.log('  - User attributes:');
      console.log('    * name:', attributes.name);
      console.log('    * email:', attributes.email);
      console.log('    * given_name:', attributes.given_name);
      console.log('    * family_name:', attributes.family_name);
      console.log('    * preferred_username:', attributes.preferred_username);
    } catch (attrError: any) {
      // Handle "User does not exist" error (can happen right after signup)
      console.log('  - WARNING: Could not fetch attributes:', attrError.message);
      console.log('  - This is normal right after signup, will use basic user data');
      // Continue without attributes - we'll use what we have from the user object
    }
    
    // Build enhanced user object
    const enhancedUser = {
      ...user,
      name: attributes.name || attributes.given_name || attributes.preferred_username || user.username,
      email: attributes.email || user.signInDetails?.loginId,
    };
    
    console.log('  - Enhanced user object:');
    console.log('    * userId:', enhancedUser.userId);
    console.log('    * username:', enhancedUser.username);
    console.log('    * name (display):', enhancedUser.name);
    console.log('    * email:', enhancedUser.email);
    console.log('========================================\n');
    
    return enhancedUser;
  } catch (error: any) {
    // Don't log UserUnAuthenticatedException as it's expected when not logged in
    if (error.name !== 'UserUnAuthenticatedException') {
      console.log('  - ERROR in getCurrentAuthUser:');
      console.error('    * Error name:', error.name);
      console.error('    * Error message:', error.message);
      console.log('========================================\n');
    } else {
      console.log('  - No authenticated user (expected)');
      console.log('========================================\n');
    }
    return null;
  }
};

/**
 * Get auth session (tokens)
 */
export const getAuthSession = async () => {
  console.log('========================================');
  console.log('AUTH - GET SESSION');
  console.log('========================================');
  
  try {
    console.log('  - Calling fetchAuthSession...');
    const session = await fetchAuthSession();
    
    console.log('  - Session retrieved:');
    console.log('    * Has tokens:', !!session.tokens);
    console.log('    * Has idToken:', !!session.tokens?.idToken);
    console.log('    * Has accessToken:', !!session.tokens?.accessToken);
    console.log('    * Identity ID:', session.identityId || 'none');
    console.log('========================================\n');
    
    return session;
  } catch (error) {
    console.log('  - ERROR in getAuthSession:');
    console.error('    * Error:', error);
    console.log('========================================\n');
    return null;
  }
};

/**
 * Get ID token for API requests
 */
export const getIdToken = async (): Promise<string | null> => {
  console.log('========================================');
  console.log('AUTH - GET ID TOKEN');
  console.log('========================================');
  
  try {
    console.log('  - Calling fetchAuthSession...');
    const session = await fetchAuthSession();
    
    const idToken = session.tokens?.idToken?.toString() || null;
    
    if (idToken) {
      console.log('  - ID Token found:');
      console.log('    * Token length:', idToken.length);
      console.log('    * Token preview:', idToken.substring(0, 30) + '...');
      
      // Parse JWT to show claims (without verification)
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        console.log('    * Token claims:');
        console.log('      - sub (userId):', payload.sub);
        console.log('      - email:', payload.email);
        console.log('      - name:', payload.name);
        console.log('      - exp:', new Date(payload.exp * 1000).toISOString());
      } catch (parseError) {
        console.log('    * Could not parse token payload');
      }
    } else {
      console.log('  - No ID Token available');
    }
    
    console.log('========================================\n');
    return idToken;
  } catch (error) {
    console.log('  - ERROR in getIdToken:');
    console.error('    * Error:', error);
    console.log('========================================\n');
    return null;
  }
};

