import { signIn as amplifySignIn, signUp, signOut, confirmSignUp, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import * as SecureStore from 'expo-secure-store';

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
  try {
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

    return {
      success: true,
      isSignUpComplete,
      userId,
      nextStep,
    };
  } catch (error: any) {
    console.error('Error signing up:', error);
    throw new Error(error.message || 'Failed to sign up');
  }
};

/**
 * Confirm sign up with verification code
 */
export const authConfirmSignUp = async (email: string, code: string) => {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });

    return {
      success: true,
      isSignUpComplete,
      nextStep,
    };
  } catch (error: any) {
    console.error('Error confirming sign up:', error);
    throw new Error(error.message || 'Failed to confirm sign up');
  }
};

/**
 * Sign in a user
 */
export const authSignIn = async ({ email, password }: SignInParams) => {
  try {
    // Check if user is already signed in first
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // User already signed in, return success
        return {
          success: true,
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' },
        };
      }
    } catch (checkError) {
      // User not signed in, continue with sign in
    }

    const { isSignedIn, nextStep } = await amplifySignIn({
      username: email,
      password,
    });

    if (isSignedIn) {
      // Store credentials securely (skip on web where SecureStore isn't available)
      try {
        await SecureStore.setItemAsync('userEmail', email);
      } catch (secureStoreError) {
        console.log('SecureStore not available (web platform)');
      }
    }

    return {
      success: true,
      isSignedIn,
      nextStep,
    };
  } catch (error: any) {
    // If error is about already signed in user, treat as success
    if (error.message?.includes('already a signed in user') || 
        error.message?.includes('already signed in') ||
        error.name === 'UserAlreadyAuthenticatedException') {
      return {
        success: true,
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      };
    }
    console.error('Error signing in:', error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Sign out the current user
 */
export const authSignOut = async () => {
  try {
    await signOut();
    // Only delete SecureStore item if not on web
    try {
      await SecureStore.deleteItemAsync('userEmail');
    } catch (secureStoreError) {
      // SecureStore might not be available on web, that's okay
      console.log('SecureStore not available (web platform)');
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentAuthUser = async () => {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (error: any) {
    // Don't log UserUnAuthenticatedException as it's expected when not logged in
    if (error.name !== 'UserUnAuthenticatedException') {
      console.error('Error getting current user:', error);
    }
    return null;
  }
};

/**
 * Get auth session (tokens)
 */
export const getAuthSession = async () => {
  try {
    const session = await fetchAuthSession();
    return session;
  } catch (error) {
    console.error('Error getting auth session:', error);
    return null;
  }
};

/**
 * Get ID token for API requests
 */
export const getIdToken = async (): Promise<string | null> => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
};

